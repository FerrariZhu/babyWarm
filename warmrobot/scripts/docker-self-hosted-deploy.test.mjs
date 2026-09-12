import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dockerfilePath = new URL("../Dockerfile", import.meta.url);
const composePath = new URL("../compose.yaml", import.meta.url);
const envPath = new URL("../.env.production.example", import.meta.url);
const nextConfigPath = new URL("../web/next.config.ts", import.meta.url);

test("production image builds both Next.js workspaces as non-root services", async () => {
  const source = await readFile(dockerfilePath, "utf8");

  assert.match(source, /npm run build -w web/);
  assert.match(source, /npm run build -w admin/);
  assert.match(source, /USER nextjs/);
});

test("compose deploys web and admin on the host network without a database container", async () => {
  const source = await readFile(composePath, "utf8");

  assert.match(source, /^\s*web:/m);
  assert.match(source, /^\s*admin:/m);
  assert.match(source, /network_mode: host/g);
  assert.doesNotMatch(source, /^\s*(postgres|supabase):/m);
  assert.match(source, /env_file:\s*\n\s*- \$\{ENV_FILE:-\.env\.production\}/);
});

test("admin listens on the public interface used by NEXT_PUBLIC_ADMIN_URL", async () => {
  const source = await readFile(composePath, "utf8");
  const adminService = source.split(/^  admin:\s*$/m)[1]?.split(/^  [a-z][a-z0-9-]*:\s*$/m)[0] ?? "";

  assert.match(adminService, /command:.*-H.*0\.0\.0\.0/);
  assert.doesNotMatch(adminService, /HOSTNAME:\s*127\.0\.0\.1/);
});

test("deployment template keeps database credentials out of the image", async () => {
  const source = await readFile(envPath, "utf8");

  assert.match(source, /^DATABASE_URL=postgresql:\/\/warmrobot_app:/m);
  assert.match(source, /^DATABASE_SSL=false$/m);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("Next.js emits standalone production output for containers", async () => {
  const source = await readFile(nextConfigPath, "utf8");

  assert.match(source, /output:\s*"standalone"/);
});
