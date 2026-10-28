import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { digestSessionToken } from "../web/src/lib/self-hosted/session-token.ts";

const ACCESS = "A".repeat(43);
const REFRESH = "R".repeat(43);
const OTHER_ACCESS = "B".repeat(43);
const OTHER_REFRESH = "S".repeat(43);

function loadModule(relativePath, resolve, logged = []) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, require: resolve,
    console: { error: (...args) => logged.push(args.map(String).join(" ")) },
  });
  return exports;
}

const helper = loadModule("../web/src/lib/self-hosted/mini-program-logout.ts", (name) => {
  assert.equal(name, "./session-token");
  return { digestSessionToken };
});

/** Stateful query double: executes the same matched-pair contract, not a real database. */
function database({ sameAccount = true, principal = "consumer", alreadyRevoked = false } = {}) {
  const timestamp = alreadyRevoked ? "2020-01-01T00:00:00Z" : null;
  const sessions = [
    { id: "session-a", principal_kind: principal, principal_id: "account-a", token_digest: digestSessionToken(ACCESS), revoked_at: timestamp, expires_at: "2020-01-01" },
    { id: "session-b", principal_kind: "consumer", principal_id: "account-a", token_digest: digestSessionToken(OTHER_ACCESS), revoked_at: null },
  ];
  const refreshTokens = [
    { id: "refresh-a", account_id: sameAccount ? "account-a" : "account-b", token_digest: digestSessionToken(REFRESH), revoked_at: timestamp, expires_at: "2020-01-01" },
    { id: "refresh-b", account_id: "account-a", token_digest: digestSessionToken(OTHER_REFRESH), revoked_at: null },
  ];
  const calls = [];
  const query = async (statement, values) => {
    calls.push({ statement, values: [...values] });
    // Keep the security-critical SQL scope checked in addition to runtime assertions.
    assert.match(statement, /rt\.account_id = s\.principal_id/);
    assert.match(statement, /s\.principal_kind = 'consumer'/);
    assert.match(statement, /s\.token_digest = \$1/);
    assert.match(statement, /rt\.token_digest = \$2/);
    assert.match(statement, /WHERE s\.id = m\.session_id/);
    assert.match(statement, /WHERE rt\.id = m\.refresh_id/);
    assert.match(statement, /FOR UPDATE OF s, rt/);
    assert.doesNotMatch(statement, /expires_at|revoked_at IS NULL/);
    const session = sessions.find((row) => row.token_digest === values[0] && row.principal_kind === "consumer");
    const refresh = refreshTokens.find((row) => row.token_digest === values[1] && row.account_id === session?.principal_id);
    if (!session || !refresh) return { revoked: false };
    session.revoked_at ??= "2026-10-28T02:00:00Z";
    refresh.revoked_at ??= "2026-10-28T02:00:00Z";
    return { revoked: true };
  };
  return { query, sessions, refreshTokens, calls };
}

function loadRoute(query, logged = []) {
  return loadModule("../web/src/app/api/auth/wechat/logout/route.ts", (name) => {
    if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    if (name.endsWith("/database")) return { queryOne: query };
    if (name.endsWith("/mini-program-logout")) return helper;
    throw new Error(`Unexpected dependency: ${name}`);
  }, logged).POST;
}

function request({ authorization = `Bearer ${ACCESS}`, body = { refresh_token: REFRESH }, rawBody, cookie } = {}) {
  return new Request("http://localhost/api/auth/wechat/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization === null ? {} : { Authorization: authorization }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

test("logout executes one atomic query with digests only, and revokes just the supplied pair", async () => {
  const db = database();
  const revoked = await helper.revokeMiniProgramSessionPair(ACCESS, REFRESH, db.query);
  assert.equal(revoked, true);
  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].values, [digestSessionToken(ACCESS), digestSessionToken(REFRESH)]);
  assert.doesNotMatch(db.calls[0].statement, new RegExp(`${ACCESS}|${REFRESH}`));
  assert.ok(db.sessions[0].revoked_at);
  assert.ok(db.refreshTokens[0].revoked_at);
  assert.equal(db.sessions[1].revoked_at, null);
  assert.equal(db.refreshTokens[1].revoked_at, null);
});

test("expired and already-revoked pairs can be logged out repeatedly without changing revocation times", async () => {
  const db = database({ alreadyRevoked: true });
  const POST = loadRoute(db.query);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, revoked: true });
  }
  assert.equal(db.sessions[0].revoked_at, "2020-01-01T00:00:00Z");
  assert.equal(db.refreshTokens[0].revoked_at, "2020-01-01T00:00:00Z");
});

test("cross-account or non-consumer pairs are rejected without mutating either token", async () => {
  for (const options of [{ sameAccount: false }, { principal: "admin" }]) {
    const db = database(options);
    const before = JSON.stringify([db.sessions, db.refreshTokens]);
    const response = await loadRoute(db.query)(request());
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "登录凭证无效" });
    assert.equal(JSON.stringify([db.sessions, db.refreshTokens]), before);
  }
});

test("unknown access and refresh tokens receive the same generic response and cause no writes", async () => {
  const unknown = "U".repeat(43);
  for (const input of [{ authorization: `Bearer ${unknown}` }, { body: { refresh_token: unknown } }]) {
    const db = database();
    const before = JSON.stringify([db.sessions, db.refreshTokens]);
    const response = await loadRoute(db.query)(request(input));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "登录凭证无效" });
    assert.equal(JSON.stringify([db.sessions, db.refreshTokens]), before);
  }
});

test("absent, wrong-scheme, unbounded and malformed bearer tokens never reach the database", async () => {
  for (const authorization of [null, "", `Basic ${ACCESS}`, `Bearer ${"a".repeat(31)}`, `Bearer ${"a".repeat(257)}`, `Bearer ${ACCESS}.suffix`, `Bearer ${ACCESS} injected`]) {
    const db = database();
    const response = await loadRoute(db.query)(request({ authorization, cookie: `warmrobot_session=${ACCESS}` }));
    assert.equal(response.status, 401);
    assert.equal(db.calls.length, 0);
  }
});

test("malformed, missing and unbounded refresh tokens are rejected before database execution", async () => {
  for (const body of [null, [], {}, { refresh_token: null }, { refresh_token: 123 }, { refresh_token: "a".repeat(31) }, { refresh_token: "a".repeat(257) }, { refresh_token: `${REFRESH} ` }, { refresh_token: "' OR 1=1 --" }]) {
    const db = database();
    const response = await loadRoute(db.query)(request({ body }));
    assert.equal(response.status, 400);
    assert.equal(db.calls.length, 0);
  }
  const db = database();
  const response = await loadRoute(db.query)(request({ rawBody: "{bad json" }));
  assert.equal(response.status, 400);
  assert.equal(db.calls.length, 0);
});

test("helper itself rejects invalid tokens before running an injected query", async () => {
  const db = database();
  await assert.rejects(helper.revokeMiniProgramSessionPair(null, REFRESH, db.query), (error) => error.status === 401);
  await assert.rejects(helper.revokeMiniProgramSessionPair(ACCESS, null, db.query), (error) => error.status === 400);
  assert.equal(db.calls.length, 0);
});

test("valid logout handler returns a non-cacheable success and ignores client account identifiers", async () => {
  const db = database();
  const response = await loadRoute(db.query)(request({ body: { refresh_token: REFRESH, account_id: "another-account" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, revoked: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].values.includes("another-account"), false);
});

test("database failures are safe and do not leak raw tokens or connection details in response or logs", async () => {
  const logged = [];
  const POST = loadRoute(async () => { throw new Error(`postgresql://password@example ${ACCESS} ${REFRESH}`); }, logged);
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const text = `${await response.text()} ${logged.join(" ")}`;
  assert.doesNotMatch(text, /postgresql|password/);
  assert.equal(text.includes(ACCESS), false);
  assert.equal(text.includes(REFRESH), false);
});
