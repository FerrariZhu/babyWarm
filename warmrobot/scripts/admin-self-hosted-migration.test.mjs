import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");
const adminRoot = path.join(projectRoot, "admin");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [absolutePath] : [];
  }));
  return nested.flat();
}

test("admin runtime has no Supabase imports or client calls", async () => {
  const files = await sourceFiles(path.join(adminRoot, "src"));
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/@supabase\/|@\/lib\/supabase|createServiceClient|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY/.test(source)) {
      violations.push(path.relative(adminRoot, file));
    }
  }

  assert.deepEqual(violations, []);
});

test("admin package and documented environment only require the cloud database", async () => {
  const packageJson = JSON.parse(await readFile(path.join(adminRoot, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies?.["@supabase/ssr"], undefined);
  assert.equal(packageJson.dependencies?.["@supabase/supabase-js"], undefined);

  const envExample = await readFile(path.join(adminRoot, ".env.local.example"), "utf8");
  assert.match(envExample, /^DATABASE_URL=/m);
  assert.doesNotMatch(envExample, /SUPABASE/);
});

test("all database-backed admin actions use the parameterized PostgreSQL layer", async () => {
  const actionFiles = [
    "src/app/admin/actions.ts",
    "src/app/admin/categories/actions.ts",
    "src/app/admin/users/actions.ts",
    "src/app/admin/variants/actions.ts",
    "src/app/admin/variants/category-guide-actions.ts",
    "src/app/admin/variants/style-guide-actions.ts",
  ];

  for (const relativePath of actionFiles) {
    const source = await readFile(path.join(adminRoot, relativePath), "utf8");
    assert.match(source, /@\/lib\/self-hosted\/database/, relativePath);
    assert.doesNotMatch(source, /@\/lib\/supabase|createServiceClient/, relativePath);
  }
});

test("self-hosted analytics migration targets local application accounts", async () => {
  const migration = await readFile(
    path.join(projectRoot, "postgres/migrations/20260911160000_analytics_events.sql"),
    "utf8"
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.analytics_events/i);
  assert.match(migration, /REFERENCES public\.app_accounts\(id\)/i);
  assert.doesNotMatch(migration, /auth\.users|auth\.uid\(\)/i);
});
