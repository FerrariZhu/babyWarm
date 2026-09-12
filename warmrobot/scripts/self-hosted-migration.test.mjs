import assert from "node:assert/strict";
import test from "node:test";

import {
  SELF_HOSTED_DATA_TABLES,
  buildSelfHostedTablePlan,
} from "./self-hosted-migration-plan.mjs";
import { buildInsertStatement, filterExistingTables, filterUnsupportedColumns, sqlLiteral } from "./export-self-hosted-data.mjs";
import { rewriteSupabaseAuthReference, terminateSqlStatement } from "./export-self-hosted-schema.mjs";

test("self-hosted migration excludes Supabase-managed authentication state", () => {
  const plan = buildSelfHostedTablePlan();

  assert.equal(plan.includes("auth.users"), false);
  assert.equal(plan.includes("auth.sessions"), false);
  assert.equal(plan.includes("auth.identities"), false);
});

test("self-hosted migration imports parents before dependent application tables", () => {
  const plan = buildSelfHostedTablePlan();

  assert.ok(plan.indexOf("public.users") < plan.indexOf("public.user_roles"));
  assert.ok(plan.indexOf("public.roles") < plan.indexOf("public.user_roles"));
  assert.ok(plan.indexOf("public.profiles") < plan.indexOf("public.babies"));
  assert.ok(plan.indexOf("public.babies") < plan.indexOf("public.clothing_items"));
  assert.deepEqual(plan, SELF_HOSTED_DATA_TABLES);
});

test("exporter serializes JSON, arrays, quotes, and nulls without interpolating identifiers", () => {
  const statement = buildInsertStatement(
    "public.weather_cache",
    { cache_key: "o'hare", payload: { temperature: 21 }, tags: ["a", "b"], city: null },
    new Map([
      ["cache_key", "text"],
      ["payload", "jsonb"],
      ["tags", "_text"],
      ["city", "text"],
    ])
  );

  assert.match(statement, /^INSERT INTO "public"\."weather_cache" \("cache_key", "payload", "tags", "city"\) VALUES /);
  assert.match(statement, /'o''hare'/);
  assert.match(statement, /'\{"temperature":21\}'::jsonb/);
  assert.match(statement, /ARRAY\['a', 'b'\]::text\[\]/);
  assert.match(statement, /NULL\);$/);
  assert.equal(sqlLiteral(undefined, "text"), "NULL");
  assert.equal(sqlLiteral([], "jsonb"), "'[]'::jsonb");
});

test("schema export redirects only auth.users foreign keys to local consumer accounts", () => {
  assert.equal(
    rewriteSupabaseAuthReference("FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"),
    "FOREIGN KEY (id) REFERENCES public.app_accounts(id) ON DELETE CASCADE"
  );
  assert.equal(
    rewriteSupabaseAuthReference("FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE"),
    "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE"
  );
});

test("schema export terminates catalog function definitions before the next statement", () => {
  assert.equal(terminateSqlStatement("CREATE FUNCTION x() RETURNS void AS $$ BEGIN END; $$"), "CREATE FUNCTION x() RETURNS void AS $$ BEGIN END; $$;");
  assert.equal(terminateSqlStatement("CREATE FUNCTION x() RETURNS void AS $$ BEGIN END; $$;"), "CREATE FUNCTION x() RETURNS void AS $$ BEGIN END; $$;");
});

test("data export only processes planned tables that exist on the source", () => {
  assert.deepEqual(
    filterExistingTables(["public.users", "public.analytics_events", "public.roles"], new Set(["users", "roles"])),
    ["public.users", "public.roles"]
  );
});

test("data export omits optional pgvector columns when the target has no vector extension", () => {
  const row = { id: "item", embedding_text: "coat", embedding: "[0.1,0.2]" };
  const types = new Map([["id", "uuid"], ["embedding_text", "text"], ["embedding", "vector"]]);

  assert.deepEqual(filterUnsupportedColumns(row, types), { id: "item", embedding_text: "coat" });
});
