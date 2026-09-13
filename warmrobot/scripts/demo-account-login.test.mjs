import assert from "node:assert/strict";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../postgres/migrations/", import.meta.url);

test("self-hosted PostgreSQL provisions the public Demo account", async () => {
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
});

test("email login distinguishes bad credentials from service failures", async () => {
  const { getEmailLoginError } = await import("../web/src/lib/auth/login-response.ts");

  assert.equal(getEmailLoginError(401), "登录未成功，请检查邮箱和密码后再试。");
  assert.equal(getEmailLoginError(503), "登录服务暂时不可用，请稍后再试。");
  assert.equal(getEmailLoginError(429), "尝试次数过多，请稍后再试。");
});
