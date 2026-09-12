import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { getDbUrl } from "../web/scripts/db-env.mjs";

const { Client } = pg;
const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_PATH = "/private/tmp/warmrobot-self-hosted-schema.sql";

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function rewriteSupabaseAuthReference(definition) {
  return definition.replaceAll(/\bauth\.users\b/g, "public.app_accounts");
}

export function terminateSqlStatement(statement) {
  const trimmed = statement.trim();
  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
}

function buildLocalAuthSchema() {
  return [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    "CREATE TABLE IF NOT EXISTS public.app_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE, phone text UNIQUE, password_hash text, display_name text, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (email IS NOT NULL OR phone IS NOT NULL));",
    "CREATE TABLE IF NOT EXISTS public.app_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), principal_kind text NOT NULL CHECK (principal_kind IN ('consumer', 'staff')), principal_id uuid NOT NULL, token_digest text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz, last_seen_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());",
    "CREATE INDEX IF NOT EXISTS app_sessions_principal_idx ON public.app_sessions (principal_kind, principal_id) WHERE revoked_at IS NULL;",
  ];
}

async function queryEnums(client) {
  const result = await client.query(`
    SELECT t.typname AS name, json_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS values_json
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE n.nspname = 'public' AND t.typtype = 'e'
     GROUP BY t.typname
     ORDER BY t.typname`);
  return result.rows;
}

async function queryTables(client) {
  const result = await client.query(`
    SELECT c.oid, c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`);
  return result.rows;
}

async function queryColumns(client, tableOid) {
  const result = await client.query(`
    SELECT a.attname AS name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull AS not_null,
           pg_get_expr(ad.adbin, ad.adrelid) AS default_expression
      FROM pg_attribute a
      LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE a.attrelid = $1::oid AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`, [tableOid]);
  return result.rows.filter((column) => !(column.name === "embedding" && column.type.startsWith("vector")));
}

async function queryConstraints(client, tableOid) {
  const result = await client.query(`
    SELECT con.contype AS type, con.conname AS name, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
     WHERE con.conrelid = $1::oid
     ORDER BY CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 ELSE 4 END, con.conname`, [tableOid]);
  return result.rows;
}

async function queryIndexes(client, tableOid) {
  const result = await client.query(`
    SELECT i.relname AS name, pg_get_indexdef(i.oid) AS definition
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
     WHERE x.indrelid = $1::oid
       AND NOT x.indisprimary
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint con
          WHERE con.conindid = i.oid
       )
     ORDER BY i.relname`, [tableOid]);
  return result.rows;
}

async function queryFunctions(client) {
  const result = await client.query(`
    SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition,
           pg_get_function_identity_arguments(p.oid) AS arguments
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid = d.refobjid
          WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
       )
     ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)`);
  return result.rows.filter((row) => !row.arguments.includes("vector"));
}

async function queryTriggers(client) {
  const result = await client.query(`
    SELECT c.relname AS table_name, tg.tgname AS name, pg_get_triggerdef(tg.oid) AS definition
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND NOT tg.tgisinternal
     ORDER BY c.relname, tg.tgname`);
  return result.rows;
}

export async function exportSelfHostedSchema({ outputPath = DEFAULT_OUTPUT_PATH } = {}) {
  const client = new Client({ connectionString: getDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const lines = [
      "-- Generated from the authorized source schema. RLS is replaced by server-side authorization.",
      "BEGIN;",
      "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
      ...buildLocalAuthSchema(),
    ];
    const enums = await queryEnums(client);
    for (const enumType of enums) {
      const values = JSON.parse(enumType.values_json)
        .map((value) => `'${value.replaceAll("'", "''")}'`)
        .join(", ");
      lines.push(`DO $$ BEGIN CREATE TYPE public.${quoteIdentifier(enumType.name)} AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    }
    const tables = await queryTables(client);
    const foreignKeys = [];
    const indexes = [];
    for (const table of tables) {
      const columns = await queryColumns(client, table.oid);
      const columnSql = columns.map((column) => `${quoteIdentifier(column.name)} ${column.type}${column.default_expression ? ` DEFAULT ${column.default_expression}` : ""}${column.not_null ? " NOT NULL" : ""}`);
      lines.push(`CREATE TABLE IF NOT EXISTS public.${quoteIdentifier(table.name)} (${columnSql.join(", ")});`);
      const constraints = await queryConstraints(client, table.oid);
      for (const constraint of constraints) {
        const definition = rewriteSupabaseAuthReference(constraint.definition);
        const statement = `ALTER TABLE public.${quoteIdentifier(table.name)} ADD CONSTRAINT ${quoteIdentifier(constraint.name)} ${definition};`;
        if (constraint.type === "f") foreignKeys.push(statement);
        else lines.push(`DO $$ BEGIN ${statement} EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      }
      indexes.push(...(await queryIndexes(client, table.oid)).map((index) => index.definition.endsWith(";") ? index.definition : `${index.definition};`));
    }
    lines.push(...foreignKeys.map((statement) => `DO $$ BEGIN ${statement} EXCEPTION WHEN duplicate_object THEN NULL; END $$;`));
    const functions = await queryFunctions(client);
    lines.push(...functions.map((fn) => terminateSqlStatement(rewriteSupabaseAuthReference(fn.definition))));
    const triggers = await queryTriggers(client);
    lines.push(...triggers.map((trigger) => `DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.name)} ON public.${quoteIdentifier(trigger.table_name)};`));
    lines.push(...triggers.map((trigger) => rewriteSupabaseAuthReference(trigger.definition).endsWith(";") ? rewriteSupabaseAuthReference(trigger.definition) : `${rewriteSupabaseAuthReference(trigger.definition)};`));
    lines.push(...indexes, "COMMIT;", "");
    const absoluteOutputPath = resolve(outputPath);
    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
    return { outputPath: absoluteOutputPath, tableCount: tables.length, enumCount: enums.length };
  } finally {
    await client.end();
  }
}

async function main() {
  const result = await exportSelfHostedSchema({ outputPath: process.argv[2] ?? DEFAULT_OUTPUT_PATH });
  console.log(`已生成 ${result.tableCount} 张表和 ${result.enumCount} 个枚举的结构包：${result.outputPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(CURRENT_DIRECTORY, "export-self-hosted-schema.mjs")) {
  main().catch((error) => {
    console.error("生成结构包失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
