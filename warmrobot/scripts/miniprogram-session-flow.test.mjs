import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const sessionSource = readFileSync(new URL("../miniprogram/utils/session.js", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../miniprogram/pages/login/index.js", import.meta.url), "utf8");
const key = "warmrobot_session";
const expired = { access_token: "old-access", refresh_token: "old-refresh", expires_at: 1 };
const renewed = { access_token: "new-access", refresh_token: "new-refresh", expires_at: Date.now() / 1000 + 7200 };
const tick = () => new Promise(setImmediate);

function setup(initial = expired) {
  const storage = new Map(initial ? [[key, initial]] : []);
  const requests = [];
  const module = { exports: {} };
  vm.runInNewContext(sessionSource, {
    module, require: () => ({ API_BASE: "https://api.example" }), Date,
    wx: {
      getStorageSync: (name) => storage.get(name),
      setStorageSync: (name, value) => storage.set(name, value),
      removeStorageSync: (name) => storage.delete(name),
      request: (options) => requests.push(options),
    },
  });
  return { storage, requests, session: module.exports };
}

function reply(request, statusCode, data = {}) { request.success({ statusCode, data }); }

test("concurrent expired requests share one refresh-token rotation", async () => {
  const { requests, session, storage } = setup();
  const first = session.authenticatedRequest("/api/weather");
  const second = session.authenticatedRequest("/api/babies");
  await tick();
  assert.equal(requests.length, 1);
  reply(requests[0], 200, { session: renewed });
  await tick();
  assert.equal(requests.length, 3);
  for (const request of requests.slice(1)) {
    assert.equal(request.header.Authorization, "Bearer new-access");
    reply(request, 200, {});
  }
  await Promise.all([first, second]);
  assert.equal(storage.get(key).refresh_token, "new-refresh");
});

test("refresh outage preserves credentials and allows a later retry", async () => {
  const { requests, session, storage } = setup();
  const first = session.authenticatedRequest("/api/weather");
  const rejection = assert.rejects(first, /暂时不可用/);
  await tick();
  reply(requests[0], 503);
  await rejection;
  assert.equal(storage.get(key), expired);
  const retry = session.authenticatedRequest("/api/weather");
  await tick();
  reply(requests[1], 200, { session: renewed });
  await tick();
  reply(requests[2], 200, { ok: true });
  assert.equal((await retry).data.ok, true);
});

test("a refresh completing after logout cannot resurrect a session", async () => {
  const { requests, session, storage } = setup();
  const pending = session.authenticatedRequest("/api/weather");
  const rejection = assert.rejects(pending, { code: "AUTH_REQUIRED" });
  await tick();
  session.clearSession();
  reply(requests[0], 200, { session: renewed });
  await rejection;
  assert.equal(storage.has(key), false);
  assert.equal(requests.length, 1);
});

test("an old refresh cannot overwrite a newer login", async () => {
  const { requests, session, storage } = setup();
  const pending = session.authenticatedRequest("/api/weather");
  const rejection = assert.rejects(pending, { code: "AUTH_REQUIRED" });
  await tick();
  const newer = { ...renewed, access_token: "other-account", refresh_token: "other-refresh" };
  session.saveSession(newer);
  reply(requests[0], 200, { session: renewed });
  await rejection;
  assert.equal(storage.get(key), newer);
  assert.equal(requests.length, 1);
});

test("revoked refresh credentials require login, rather than retrying forever", async () => {
  const { requests, session, storage } = setup();
  const pending = session.authenticatedRequest("/api/weather");
  const rejection = assert.rejects(pending, { code: "AUTH_REQUIRED" });
  await tick();
  reply(requests[0], 401);
  await rejection;
  assert.equal(storage.has(key), false);
});

test("parallel 401 responses reuse an already-rotated access token", async () => {
  const { requests, session } = setup({ ...expired, expires_at: renewed.expires_at });
  const first = session.authenticatedRequest("/api/weather");
  const second = session.authenticatedRequest("/api/babies");
  await tick();
  reply(requests[0], 401);
  await tick();
  reply(requests[2], 200, { session: renewed });
  await tick();
  reply(requests[1], 401);
  await tick();
  assert.equal(requests.filter((request) => request.url.endsWith("/refresh")).length, 1);
  for (const request of requests.slice(3)) {
    assert.equal(request.header.Authorization, "Bearer new-access");
    reply(request, 200);
  }
  await Promise.all([first, second]);
});

test("cold launch restores a saved session without another phone authorization", async () => {
  let definition;
  const navigation = [];
  vm.runInNewContext(loginSource, {
    Page: (value) => { definition = value; },
    require: () => ({ ensureSession: async () => renewed }),
    wx: { reLaunch: (options) => navigation.push(options.url) },
  });
  const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  await page.onLoad();
  assert.deepEqual(navigation, ["/pages/home/index"]);
  assert.equal(page.data.loading, false);
});

test("phone login ignores repeated taps while authorization is in flight", async () => {
  let definition;
  let calls = 0;
  vm.runInNewContext(loginSource, {
    Page: (value) => { definition = value; },
    require: () => ({}),
    wx: { login: () => { calls += 1; } },
  });
  const page = { ...definition, data: { loading: true }, setData() {} };
  await page.onGetPhoneNumber({ detail: { code: "phone-code" } });
  assert.equal(calls, 0);
});

test("restoring a session after the login page is closed does not navigate", async () => {
  let definition;
  let resolveSession;
  const navigation = [];
  vm.runInNewContext(loginSource, {
    Page: (value) => { definition = value; },
    require: () => ({ ensureSession: () => new Promise((resolve) => { resolveSession = resolve; }) }),
    wx: { reLaunch: (options) => navigation.push(options.url) },
  });
  const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  const pending = page.onLoad();
  page.onUnload();
  resolveSession(renewed);
  await pending;
  assert.deepEqual(navigation, []);
});

test("logout revokes the presented pair once before clearing the local session", async () => {
  const { requests, session, storage } = setup(renewed);
  const pending = session.logoutSession();
  assert.equal(session.logoutSession(), pending);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/api\/auth\/wechat\/logout$/);
  assert.equal(requests[0].header.Authorization, "Bearer new-access");
  assert.equal(requests[0].data.refresh_token, "new-refresh");
  assert.equal(requests[0].timeout, 5000);
  assert.equal(storage.get(key), renewed);
  await assert.rejects(session.authenticatedRequest("/api/weather"), { code: "AUTH_REQUIRED" });
  assert.equal(requests.length, 1);
  reply(requests[0], 200, { ok: true, revoked: true });
  assert.equal((await pending).revoked, true);
  assert.equal(storage.has(key), false);
});

test("offline logout always clears local credentials and does not claim revocation", async () => {
  const { requests, session, storage } = setup(renewed);
  const pending = session.logoutSession();
  requests[0].fail({ errMsg: "request:fail network" });
  assert.equal((await pending).revoked, false);
  assert.equal(storage.has(key), false);
});

test("an unconfirmed server logout also clears local credentials", async () => {
  const { requests, session, storage } = setup(renewed);
  const pending = session.logoutSession();
  reply(requests[0], 401, { error: "No matching session" });
  assert.equal((await pending).revoked, false);
  assert.equal(storage.has(key), false);
});

test("logout waits for known rotation and revokes the returned replacement pair", async () => {
  const { requests, session, storage } = setup();
  const protectedRequest = session.authenticatedRequest("/api/weather");
  const rejected = assert.rejects(protectedRequest, { code: "AUTH_REQUIRED" });
  await tick();
  const pending = session.logoutSession();
  assert.equal(requests.length, 1);
  reply(requests[0], 200, { session: renewed });
  await tick();
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/logout$/);
  assert.equal(requests[1].data.refresh_token, renewed.refresh_token);
  assert.equal(requests[1].header.Authorization, `Bearer ${renewed.access_token}`);
  reply(requests[1], 200, { revoked: true });
  await rejected;
  assert.equal((await pending).revoked, true);
  assert.equal(storage.has(key), false);
  assert.equal(requests.some((request) => request.url.endsWith("/api/weather")), false);
});

test("a lost refresh response prevents claiming that all replacement tokens were revoked", async () => {
  const { requests, session, storage } = setup();
  const protectedRequest = session.authenticatedRequest("/api/weather");
  const rejected = assert.rejects(protectedRequest);
  await tick();
  const pending = session.logoutSession();
  requests[0].fail({ errMsg: "request:fail timeout" });
  await tick();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].data.refresh_token, expired.refresh_token);
  reply(requests[1], 200, { revoked: true });
  await rejected;
  assert.equal((await pending).revoked, false);
  assert.equal(storage.has(key), false);
});

test("late logout completion cannot clear a newer login", async () => {
  const { requests, session, storage } = setup(renewed);
  const pending = session.logoutSession();
  const newer = { ...renewed, access_token: "another-access", refresh_token: "another-refresh" };
  session.saveSession(newer);
  reply(requests[0], 200, { revoked: true });
  assert.equal((await pending).superseded, true);
  assert.equal(storage.get(key), newer);
});

test("logout without stored credentials needs no network request", async () => {
  const { requests, session, storage } = setup(null);
  assert.equal((await session.logoutSession()).noSession, true);
  assert.equal(requests.length, 0);
  assert.equal(storage.has(key), false);
});

test("login explains when only local logout could be confirmed", async () => {
  let definition;
  vm.runInNewContext(loginSource, {
    Page: (value) => { definition = value; },
    require: () => ({ ensureSession: async () => null }),
    wx: { reLaunch: () => assert.fail("must not restore cleared local login") },
  });
  const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  await page.onLoad({ logout: "local" });
  assert.match(page.data.notice, /已清除本机登录/);
  assert.match(page.data.notice, /撤销未确认/);
});

test("a rejected in-flight refresh cannot strand logout on the home screen", async () => {
  const { requests, session, storage } = setup();
  const protectedRequest = session.authenticatedRequest("/api/weather");
  const rejected = assert.rejects(protectedRequest, { code: "AUTH_REQUIRED" });
  await tick();
  const pending = session.logoutSession();
  reply(requests[0], 401);
  await tick();
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/logout$/);
  assert.equal(requests[1].data.refresh_token, expired.refresh_token);
  reply(requests[1], 200, { revoked: true });
  await rejected;
  const result = await pending;
  assert.equal(result.superseded, false);
  assert.equal(result.revoked, true);
  assert.equal(storage.has(key), false);
});
