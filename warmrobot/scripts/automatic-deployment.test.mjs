import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/deploy-production.yml", import.meta.url);
const deployScriptUrl = new URL("../deploy/deploy-production.sh", import.meta.url);
const gatewayScriptUrl = new URL("../deploy/ssh-deploy-gateway.sh", import.meta.url);
const migrationScriptUrl = new URL("../deploy/run-postgres-migrations.sh", import.meta.url);
const knownHostsUrl = new URL("../deploy/known_hosts", import.meta.url);
const migrationsUrl = new URL("../postgres/migrations/", import.meta.url);

test("main deploys only after the complete verification gate", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.match(workflow, /group:\s*warmrobot-production/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /needs:\s*verify/);
  assert.match(workflow, /environment:\s*\n\s+name:\s*production/);
  assert.match(workflow, /secrets\.DEPLOY_SSH_KEY/);
  assert.match(workflow, /root@warmbaby\.top/);
  assert.match(workflow, /warmrobot-deploy.*GITHUB_SHA/);
  assert.match(workflow, /BASE_SHA/);
  assert.match(workflow, /git diff.*--diff-filter=ACMRTUXB/);
  assert.match(workflow, /\.release-base/);
  assert.doesNotMatch(workflow, /sudo -n/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/);
});

test("the privileged SSH identity is restricted to one validated deploy command", async () => {
  const source = await readFile(gatewayScriptUrl, "utf8");

  assert.match(source, /SSH_ORIGINAL_COMMAND/);
  assert.match(source, /\^warmrobot-deploy \[0-9a-f\]\{40\} \[0-9a-f\]\{40\}\$/);
  assert.match(source, /exec \/usr\/local\/sbin\/warmrobot-deploy/);
  assert.doesNotMatch(source, /\beval\b/);
});

test("the production deploy is serialized, migrates, health-checks, and can roll back", async () => {
  const source = await readFile(deployScriptUrl, "utf8");

  assert.match(source, /flock/);
  assert.match(source, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(source, /warmrobot-releases/);
  assert.match(source, /\.release-base/);
  assert.match(source, /\.release-id/);
  assert.match(source, /base release does not match/);
  assert.match(source, /\.release-deletes/);
  assert.match(source, /warmrobot-shared\/\.env\.production/);
  assert.match(source, /run-postgres-migrations\.sh/);
  assert.match(source, /docker compose.*build/);
  assert.match(source, /docker compose.*up -d/);
  assert.match(source, /127\.0\.0\.1:3000\/login/);
  assert.match(source, /127\.0\.0\.1:3001\/login/);
  assert.match(source, /rollback/);
  assert.ok(
    source.indexOf("for required in") < source.indexOf('touch "${RELEASE_DIR}/.release-ready"'),
    "a release must not be marked ready before required files are validated",
  );
});

test("the migration runner records each successful migration exactly once", async () => {
  const source = await readFile(migrationScriptUrl, "utf8");

  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.schema_migrations/);
  assert.match(source, /ON_ERROR_STOP/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /INSERT INTO public\.schema_migrations/);
  assert.match(source, /LC_ALL=C/);
});

test("migration files leave transaction ownership to the runner", async () => {
  const migrationNames = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql"));

  for (const migrationName of migrationNames) {
    const source = await readFile(new URL(migrationName, migrationsUrl), "utf8");
    assert.doesNotMatch(source, /^\s*(BEGIN|COMMIT)\s*;/im, migrationName);
  }
});

test("SSH verifies the pinned production host key", async () => {
  const knownHosts = await readFile(knownHostsUrl, "utf8");

  assert.match(knownHosts, /^warmbaby\.top ssh-ed25519 /m);
  assert.doesNotMatch(knownHosts, /PRIVATE KEY/);
});
