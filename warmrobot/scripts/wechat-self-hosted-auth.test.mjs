import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  exchangeWechatCredentials,
  validateWechatLoginPayload,
} from "../web/src/lib/auth/wechat-provider.ts";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  buildMiniProgramSession,
  digestSessionToken,
  generateSessionToken,
} from "../web/src/lib/self-hosted/session-token.ts";

test("微信登录请求只接受短期 code，不信任客户端提交的 openid 或手机号", () => {
  assert.deepEqual(
    validateWechatLoginPayload({
      code: " login-code ",
      phone_code: " phone-code ",
      openid: "client-controlled",
      phone: "13800138000",
    }),
    { code: "login-code", phoneCode: "phone-code" }
  );
  assert.throws(() => validateWechatLoginPayload({ code: "", phone_code: "phone" }), /登录凭证/);
  assert.throws(() => validateWechatLoginPayload({ code: "login", phone_code: "" }), /手机号授权凭证/);
  assert.throws(() => validateWechatLoginPayload(null), /请求体无效/);
  assert.throws(
    () => validateWechatLoginPayload({ code: "a".repeat(513), phone_code: "phone" }),
    /登录凭证/
  );
});

test("微信身份与手机号都从微信服务端响应中取得", async () => {
  const requests = [];
  const fetchStub = async (input, init = {}) => {
    requests.push({ input: String(input), init });
    if (String(input).includes("jscode2session")) {
      return Response.json({ openid: "openid-1", unionid: "unionid-1" });
    }
    if (String(input).includes("/cgi-bin/token")) {
      return Response.json({ access_token: "wechat-access-token", expires_in: 7200 });
    }
    return Response.json({ phone_info: { purePhoneNumber: "13800138000" } });
  };

  const identity = await exchangeWechatCredentials(
    { code: "login-code", phoneCode: "phone-code" },
    { appId: "app-id", appSecret: "app-secret", fetchImpl: fetchStub }
  );

  assert.deepEqual(identity, {
    openid: "openid-1",
    unionid: "unionid-1",
    phone: "13800138000",
  });
  assert.equal(requests.length, 3);
  assert.match(requests[2].init.body, /"code":"phone-code"/);
});

test("微信接口异常不会泄露 AppSecret，也不会建立本地身份", async () => {
  const fetchStub = async () => Response.json({ errcode: 40029, errmsg: "invalid code" });
  await assert.rejects(
    exchangeWechatCredentials(
      { code: "bad-code", phoneCode: "phone-code" },
      { appId: "app-id", appSecret: "do-not-leak", fetchImpl: fetchStub }
    ),
    (error) => {
      assert.equal(String(error).includes("do-not-leak"), false);
      return true;
    }
  );
});

test("微信服务的 HTTP、字段和网络异常都被安全拒绝", async () => {
  const options = { appId: "app-id", appSecret: "secret" };

  await assert.rejects(
    exchangeWechatCredentials(
      { code: "login", phoneCode: "phone" },
      { ...options, fetchImpl: async () => new Response(null, { status: 503 }) }
    ),
    /微信服务暂时不可用/
  );
  await assert.rejects(
    exchangeWechatCredentials(
      { code: "login", phoneCode: "phone" },
      { ...options, fetchImpl: async () => { throw new Error("network URL secret"); } }
    ),
    /微信服务暂时不可用/
  );
  await assert.rejects(
    exchangeWechatCredentials(
      { code: "login", phoneCode: "phone" },
      { ...options, fetchImpl: async () => Response.json({}) }
    ),
    /登录凭证已失效/
  );

  let call = 0;
  await assert.rejects(
    exchangeWechatCredentials(
      { code: "login", phoneCode: "phone" },
      {
        ...options,
        fetchImpl: async () => {
          call += 1;
          return call === 1 ? Response.json({ openid: "openid" }) : Response.json({});
        },
      }
    ),
    /微信服务暂时不可用/
  );

  call = 0;
  await assert.rejects(
    exchangeWechatCredentials(
      { code: "login", phoneCode: "phone" },
      {
        ...options,
        fetchImpl: async () => {
          call += 1;
          if (call === 1) return Response.json({ openid: "openid" });
          if (call === 2) return Response.json({ access_token: "token" });
          return Response.json({ phone_info: { purePhoneNumber: "not-a-phone" } });
        },
      }
    ),
    /有效手机号/
  );
});

test("自有会话使用随机不透明令牌，数据库只需保存摘要", () => {
  const first = generateSessionToken();
  const second = generateSessionToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 43);
  assert.equal(digestSessionToken(first).length, 64);
  assert.equal(digestSessionToken(first).includes(first), false);

  const now = new Date("2026-09-10T00:00:00.000Z");
  const session = buildMiniProgramSession("access", "refresh", now);
  assert.deepEqual(session, {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: Math.floor(now.getTime() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: "bearer",
  });
});

test("微信登录与刷新路由完全脱离 Supabase，并接入本地令牌轮换", async () => {
  const loginRoute = await readFile(
    new URL("../web/src/app/api/auth/wechat/login/route.ts", import.meta.url),
    "utf8"
  );
  const refreshRoute = await readFile(
    new URL("../web/src/app/api/auth/wechat/refresh/route.ts", import.meta.url),
    "utf8"
  );
  const authSource = await readFile(
    new URL("../web/src/lib/self-hosted/auth.ts", import.meta.url),
    "utf8"
  );
  const databaseSource = await readFile(
    new URL("../web/src/lib/self-hosted/database.ts", import.meta.url),
    "utf8"
  );
  const migration = await readFile(
    new URL("../postgres/migrations/20260910221000_wechat_self_hosted_auth.sql", import.meta.url),
    "utf8"
  );

  for (const source of [loginRoute, refreshRoute]) {
    assert.doesNotMatch(source, /@supabase|Supabase|getSupabaseEnv|createServiceClient/);
  }
  assert.match(loginRoute, /ensureSelfHostedWechatUser/);
  assert.match(loginRoute, /createMiniProgramSession/);
  assert.match(refreshRoute, /rotateMiniProgramSession/);
  assert.match(authSource, /getBearerToken/);
  assert.match(databaseSource, /WEB_DATABASE_URL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.app_refresh_tokens/i);
  assert.match(migration, /token_digest text NOT NULL UNIQUE/i);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON public\.login_identities TO warmrobot_app/i);
});
