import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");
const webRoot = path.join(projectRoot, "web");

test("consumer package and environment template use only cloud-server infrastructure", async () => {
  const envExample = await readFile(path.join(webRoot, ".env.local.example"), "utf8");
  assert.match(envExample, /^(?:WEB_)?DATABASE_URL=/m);
});

test("published database commands target the self-hosted PostgreSQL configuration", async () => {
  const packageJson = JSON.parse(await readFile(path.join(webRoot, "package.json"), "utf8"));
  const dbEnv = await readFile(path.join(webRoot, "scripts/db-env.mjs"), "utf8");
  const migration = await readFile(path.join(webRoot, "scripts/apply-migration.mjs"), "utf8");

  assert.match(dbEnv, /WEB_DATABASE_URL/);
  assert.match(dbEnv, /DATABASE_URL/);
  assert.match(migration, /"postgres", "migrations"/);
  assert.equal(packageJson.scripts["db:ping"], "node scripts/db-ping.mjs");
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/apply-migration.mjs");
  assert.equal(packageJson.scripts["db:clear"], undefined);
});

test("consumer pages use the application-owned session implementation", async () => {
  for (const relativePath of [
    "src/lib/profile.ts",
    "src/lib/daily-brief/get-home-daily-brief.ts",
    "src/lib/dressing-records/list.ts",
  ]) {
    const source = await readFile(path.join(webRoot, relativePath), "utf8");
    assert.match(source, /@\/lib\/self-hosted\/session/, relativePath);
  }
});

test("obsolete hosted-auth callback is absent", async () => {
  await assert.rejects(access(path.join(webRoot, "src/app/auth/callback/route.ts")));
});

test("project documentation describes the cloud-server architecture", async () => {
  for (const relativePath of ["README.md", "../README.md"]) {
    const source = await readFile(path.join(projectRoot, relativePath), "utf8");
    assert.match(source, /PostgreSQL/);
  }
});
