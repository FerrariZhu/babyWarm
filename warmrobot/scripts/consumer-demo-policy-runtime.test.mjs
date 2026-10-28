import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(new URL("../package.json", import.meta.url));
const ts = require("typescript");
const { isBlockedSharedDemoAccount } = await import("../web/src/lib/auth/consumer-account-policy.ts");

async function loadModule(path, mocks) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, module: { exports }, console, Buffer, process,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name.startsWith("node:")) return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function routeMocks() {
  const calls = { query: 0, session: 0 };
  return { calls, mocks: {
    "@/lib/auth/consumer-account-policy": { isBlockedSharedDemoAccount },
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200, cookies: { set() {} } }) } },
    "@/lib/self-hosted/database": { queryOne: async () => { calls.query++; return { id: "synthetic-user", password_hash: "mock-hash" }; } },
    "@/lib/self-hosted/auth": {
      verifyPassword: () => true, hashPassword: () => "mock-hash", sessionCookieOptions: () => ({}),
      createConsumerSession: async () => { calls.session++; return "synthetic-test-token"; },
    },
  } };
}

for (const action of ["login", "register"]) {
  test(`email ${action} rejects shared demo before DB or session creation`, async () => {
    const { calls, mocks } = routeMocks();
    const { POST } = await loadModule(`../web/src/app/api/auth/email/${action}/route.ts`, mocks);
    const response = await POST({ json: async () => ({ email: " DEMO_USER_1@WARMROBOT.DEV ", password: "synthetic-password" }) });
    assert.equal(response.status, action === "login" ? 401 : 400);
    assert.deepEqual(calls, { query: 0, session: 0 });
  });
  test(`email ${action} keeps ordinary accounts working`, async () => {
    const { calls, mocks } = routeMocks();
    const { POST } = await loadModule(`../web/src/app/api/auth/email/${action}/route.ts`, mocks);
    const response = await POST({ json: async () => ({ email: "person@example.test", password: "synthetic-password" }) });
    assert.equal(response.status, 200);
    assert.deepEqual(calls, { query: 1, session: 1 });
  });
}

for (const transport of ["cookie", "bearer"]) {
  test(`existing ${transport} demo session cannot resolve a consumer identity`, async () => {
    let account = { id: "synthetic-user", email: "DEMO_USER_1@WARMROBOT.DEV", phone: null, displayName: null };
    const { getCurrentUser } = await loadModule("../web/src/lib/self-hosted/auth.ts", {
      "@/lib/auth/consumer-account-policy": { isBlockedSharedDemoAccount },
      "next/headers": {
        headers: async () => ({ get: () => transport === "bearer" ? "Bearer synthetic-test-token" : null }),
        cookies: async () => ({ get: () => ({ value: "synthetic-test-token" }) }),
      },
      "@/lib/auth/bearer-token": { getBearerToken: () => "synthetic-test-token" },
      "@/lib/self-hosted/session-token": { digestSessionToken: () => "synthetic-digest" },
      "@/lib/self-hosted/database": { queryOne: async () => account, query: async () => [] },
    });
    assert.equal(await getCurrentUser(), null);
    account = { ...account, email: "person@example.test" };
    assert.equal((await getCurrentUser()).id, "synthetic-user");
  });
}
