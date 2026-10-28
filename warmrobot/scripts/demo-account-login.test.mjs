import assert from "node:assert/strict";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../postgres/migrations/", import.meta.url);

test("historical demo seed is followed by non-destructive deactivation", async () => {
  const migrationNames = await readdir(migrationsUrl);
  const demoMigrationName = migrationNames.find((name) => name.endsWith("_demo_account.sql"));

  assert.ok(demoMigrationName, "缺少 Demo 账号 PostgreSQL 增量迁移");

  const migration = await readFile(new URL(demoMigrationName, migrationsUrl), "utf8");
  assert.match(migration, /INSERT INTO public\.app_accounts/i);
  assert.match(migration, /demo_user_1@warmrobot\.dev/i);
  assert.match(migration, /ON CONFLICT \(email\) DO UPDATE/i);
  assert.match(migration, /is_active\s*=\s*true/i);

  const hashMatch = migration.match(/scrypt\$([^$']+)\$([^']+)/);
  assert.ok(hashMatch, "Demo 账号必须使用应用支持的 scrypt 密码摘要");

  const [, salt, expected] = hashMatch;
  const actual = scryptSync("password123", salt, 64).toString("base64url");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  assert.equal(actualBuffer.length, expectedBuffer.length);
  assert.equal(timingSafeEqual(actualBuffer, expectedBuffer), true);
  const disableName = "20261028010000_disable_shared_demo_account.sql";
  assert.ok(migrationNames.includes(disableName));
  assert.ok(disableName > demoMigrationName);
  const disable = await readFile(new URL(disableName, migrationsUrl), "utf8");
  assert.match(disable, /is_active = false/);
  assert.match(disable, /UPDATE public\.app_sessions/);
  assert.match(disable, /UPDATE public\.app_refresh_tokens/);
  assert.doesNotMatch(disable, /\bDELETE\s+FROM|\bDROP\s+TABLE/i);
});

test("email login distinguishes bad credentials from service failures", async () => {
  const { getEmailLoginError } = await import("../web/src/lib/auth/login-response.ts");

  assert.equal(getEmailLoginError(401), "登录未成功，请检查邮箱和密码后再试。");
  assert.equal(getEmailLoginError(503), "登录服务暂时不可用，请稍后再试。");
  assert.equal(getEmailLoginError(429), "尝试次数过多，请稍后再试。");
});

 test("shared demo is blocked regardless of email case, but normal accounts remain usable", async () => {
  const { isBlockedSharedDemoAccount } = await import("../web/src/lib/auth/consumer-account-policy.ts");
  for (const email of ["demo_user_1@warmrobot.dev", " DEMO_USER_1@WARMROBOT.DEV "]) {
    assert.equal(isBlockedSharedDemoAccount(email), true);
  }
  for (const email of [null, undefined, "", "person@example.test", "another@warmrobot.dev"]) {
    assert.equal(isBlockedSharedDemoAccount(email), false);
  }
});

test("server blocks shared demo login, recreation, and existing cookie or bearer sessions", async () => {
  for (const path of ["../web/src/app/api/auth/email/login/route.ts", "../web/src/app/api/auth/email/register/route.ts"]) {
    const code = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(code, /if \(isBlockedSharedDemoAccount\(email\)\)/);
    assert.ok(code.indexOf("isBlockedSharedDemoAccount(email)") < code.indexOf("await queryOne"));
  }
  const auth = await readFile(new URL("../web/src/lib/self-hosted/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /return user && !isBlockedSharedDemoAccount\(user.email\) \? user : null/);
  assert.match(auth, /getBearerToken/);
});
