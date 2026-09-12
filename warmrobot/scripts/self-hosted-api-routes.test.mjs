import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDirectory, "../web/src/app/api");

const routes = [
  "analytics/events/route.ts",
  "babies/route.ts",
  "babies/[id]/route.ts",
    "babies/[id]/diaper-prompt/route.ts",
    "dressing-records/route.ts",
    "profile/location/route.ts",
  "weather/route.ts",
];

test("self-hosted business API routes do not use the Supabase runtime", async () => {
  for (const route of routes) {
    const source = await readFile(path.join(webRoot, route), "utf8");
    assert.doesNotMatch(source, /@\/lib\/supabase\/server/);
    assert.doesNotMatch(source, /createClient\(/);
    assert.match(source, /@\/lib\/self-hosted\/auth/);
  }
});

test("database-backed self-hosted routes use the parameterized query layer", async () => {
  for (const route of [
    "analytics/events/route.ts",
    "babies/route.ts",
    "babies/[id]/route.ts",
    "babies/[id]/diaper-prompt/route.ts",
    "dressing-records/route.ts",
    "profile/location/route.ts",
    "weather/route.ts",
  ]) {
    const source = await readFile(path.join(webRoot, route), "utf8");
    assert.match(source, /@\/lib\/self-hosted\/database/);
  }
});

test("baby profile creation gives the optional size parameter an explicit PostgreSQL type", async () => {
  const source = await readFile(path.join(webRoot, "babies/route.ts"), "utf8");

  assert.match(source, /CASE WHEN \$9::text IS NULL THEN NULL ELSE now\(\) END/);
});
