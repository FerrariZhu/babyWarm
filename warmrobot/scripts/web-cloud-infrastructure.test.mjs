import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");
const webRoot = path.join(projectRoot, "web");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    if (entry.name === "legacy-wardrobe") return [];
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [absolutePath] : [];
  }));
  return nested.flat();
}

test("consumer runtime has no Supabase imports, clients, or environment variables", async () => {
  const files = await sourceFiles(path.join(webRoot, "src"));
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/@supabase\/|@\/lib\/supabase|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY|getSupabaseEnv/.test(source)) {
      violations.push(path.relative(webRoot, file));
    }
  }

  assert.deepEqual(violations, []);
});

test("consumer package and environment template use only cloud-server infrastructure", async () => {
  const packageJson = JSON.parse(await readFile(path.join(webRoot, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies?.["@supabase/ssr"], undefined);
  assert.equal(packageJson.dependencies?.["@supabase/supabase-js"], undefined);

  const envExample = await readFile(path.join(webRoot, ".env.local.example"), "utf8");
  assert.match(envExample, /^(?:WEB_)?DATABASE_URL=/m);
  assert.doesNotMatch(envExample, /SUPABASE/);
});

test("consumer pages use the application-owned session implementation", async () => {
  for (const relativePath of [
    "src/lib/profile.ts",
    "src/lib/daily-brief/get-home-daily-brief.ts",
    "src/lib/dressing-records/list.ts",
  ]) {
    const source = await readFile(path.join(webRoot, relativePath), "utf8");
    assert.match(source, /@\/lib\/self-hosted\/session/, relativePath);
    assert.doesNotMatch(source, /@\/lib\/supabase/, relativePath);
  }
});

test("obsolete hosted-auth callback is absent", async () => {
  await assert.rejects(access(path.join(webRoot, "src/app/auth/callback/route.ts")));
});

test("project documentation describes the cloud-server architecture", async () => {
  for (const relativePath of ["README.md", "../README.md"]) {
    const source = await readFile(path.join(projectRoot, relativePath), "utf8");
    assert.match(source, /PostgreSQL/);
    assert.doesNotMatch(source, /Supabase/);
  }
});
