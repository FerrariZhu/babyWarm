import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { buildSelfHostedTablePlan } from "./self-hosted-migration-plan.mjs";
import { getDbUrl } from "../web/scripts/db-env.mjs";

const { Client } = pg;

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_PATH = "/private/tmp/warmrobot-self-hosted-data.sql";

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function arrayElementLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("数组中不能包含非有限数值");
    return String(value);
  }
  return quoteString(String(value));
}

export function sqlLiteral(value, dataType) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("不能导出非有限数值");
    return String(value);
  }
  if (Buffer.isBuffer(value)) return `decode(${quoteString(value.toString("hex"))}, 'hex')`;
  if (dataType === "json" || dataType === "jsonb") {
    return `${quoteString(JSON.stringify(value))}::${dataType}`;
  }
  if (Array.isArray(value)) {
    const elementType = dataType.startsWith("_") ? dataType.slice(1) : "text";
    return `ARRAY[${value.map(arrayElementLiteral).join(", ")}]::${elementType}[]`;
  }
  if (value instanceof Date) return quoteString(value.toISOString());
  return quoteString(String(value));
}

export function buildInsertStatement(qualifiedTable, row, columnTypes) {
  const [schema, table] = qualifiedTable.split(".");
  if (!schema || !table || qualifiedTable.split(".").length !== 2) {
    throw new Error(`无效表名：${qualifiedTable}`);
  }
  const columns = Object.keys(row);
  const values = columns.map((column) => sqlLiteral(row[column], columnTypes.get(column) ?? "text"));
  return `INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${values.join(", ")});`;
}

export function filterExistingTables(plannedTables, existingTableNames) {
  return plannedTables.filter((qualifiedTable) => existingTableNames.has(qualifiedTable.split(".")[1]));
}

export function filterUnsupportedColumns(row, columnTypes) {
  return Object.fromEntries(
    Object.entries(row).filter(([column]) => !columnTypes.get(column)?.startsWith("vector"))
  );
}

async function loadColumnTypes(client, schema, table) {
  const result = await client.query(
    `SELECT column_name, udt_name
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position`,
    [schema, table]
  );
  return new Map(result.rows.map((row) => [row.column_name, row.udt_name]));
}

async function exportTable(client, qualifiedTable) {
  const [schema, table] = qualifiedTable.split(".");
  const columnTypes = await loadColumnTypes(client, schema, table);
  const result = await client.query(`SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`);
  const statements = result.rows.map((row) =>
    buildInsertStatement(qualifiedTable, filterUnsupportedColumns(row, columnTypes), columnTypes)
  );
  return { statements, rowCount: result.rowCount ?? 0 };
}

async function loadExistingPublicTables(client) {
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  return new Set(result.rows.map((row) => row.table_name));
}

export async function exportSelfHostedData({ outputPath = DEFAULT_OUTPUT_PATH } = {}) {
  const client = new Client({
    connectionString: getDbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const plannedTables = buildSelfHostedTablePlan();
    const tables = filterExistingTables(plannedTables, await loadExistingPublicTables(client));
    const skippedTables = plannedTables.filter((table) => !tables.includes(table));
    const lines = [
      "-- Generated locally from the authorized source database. Keep this file private.",
      "BEGIN;",
      "SET LOCAL client_min_messages = warning;",
    ];
    const counts = [];
    for (const table of tables) {
      const exported = await exportTable(client, table);
      lines.push(...exported.statements);
      counts.push({ table, rowCount: exported.rowCount });
    }
    lines.push("COMMIT;", "");
    const absoluteOutputPath = resolve(outputPath);
    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
    return { outputPath: absoluteOutputPath, counts, skippedTables };
  } finally {
    await client.end();
  }
}

async function main() {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const result = await exportSelfHostedData({ outputPath });
  for (const { table, rowCount } of result.counts) {
    console.log(`${table}: ${rowCount}`);
  }
  for (const table of result.skippedTables) {
    console.log(`${table}: 源端不存在，已跳过`);
  }
  console.log(`迁移包已生成：${result.outputPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(CURRENT_DIRECTORY, "export-self-hosted-data.mjs")) {
  main().catch((error) => {
    console.error("生成迁移包失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
