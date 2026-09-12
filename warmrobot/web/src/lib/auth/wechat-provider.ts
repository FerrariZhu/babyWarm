const WECHAT_REQUEST_TIMEOUT_MS = 8_000;
const MAX_CODE_LENGTH = 512;

export type WechatLoginPayload = { code: string; phoneCode: string };
export type VerifiedWechatIdentity = {
  openid: string;
  unionid: string | null;
  phone: string;
};

type ExchangeOptions = {
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
};

export class WechatProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WechatProviderError";
  }
}

function normalizeChinaPhone(value: string) {
  return value.trim().replace(/^\+?86/, "").replace(/[\s-]/g, "");
}

function isChinaMobilePhone(value: string) {
  return /^1\d{10}$/.test(value);
}

function readCode(value: unknown, label: string) {
  const code = typeof value === "string" ? value.trim() : "";
  if (!code || code.length > MAX_CODE_LENGTH || /[\u0000-\u001f\u007f]/.test(code)) {
    throw new Error(`缺少或无效的${label}`);
  }
  return code;
}

export function validateWechatLoginPayload(raw: unknown): WechatLoginPayload {
  if (!raw || typeof raw !== "object") throw new Error("请求体无效");
  const body = raw as Record<string, unknown>;
  return {
    code: readCode(body.code, "微信登录凭证"),
    phoneCode: readCode(body.phone_code, "手机号授权凭证"),
  };
}

async function fetchWechatJson(
  fetchImpl: typeof fetch,
  input: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  try {
    const response = await fetchImpl(input, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(WECHAT_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new WechatProviderError("微信服务暂时不可用");
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.errcode === "number" && payload.errcode !== 0) {
      throw new WechatProviderError("微信凭证验证失败，请重新授权");
    }
    return payload;
  } catch (error) {
    if (error instanceof WechatProviderError) throw error;
    throw new WechatProviderError("微信服务暂时不可用");
  }
}

export async function exchangeWechatCredentials(
  payload: WechatLoginPayload,
  options: ExchangeOptions
): Promise<VerifiedWechatIdentity> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const session = await fetchWechatJson(
    fetchImpl,
    `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(options.appId)}&secret=${encodeURIComponent(options.appSecret)}&js_code=${encodeURIComponent(payload.code)}&grant_type=authorization_code`
  );
  const openid = typeof session.openid === "string" ? session.openid.trim() : "";
  const unionid = typeof session.unionid === "string" ? session.unionid.trim() || null : null;
  if (!openid) throw new WechatProviderError("微信登录凭证已失效，请重试");

  const accessTokenPayload = await fetchWechatJson(
    fetchImpl,
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(options.appId)}&secret=${encodeURIComponent(options.appSecret)}`
  );
  const accessToken =
    typeof accessTokenPayload.access_token === "string"
      ? accessTokenPayload.access_token.trim()
      : "";
  if (!accessToken) throw new WechatProviderError("微信服务暂时不可用");

  const phonePayload = await fetchWechatJson(
    fetchImpl,
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: payload.phoneCode }),
    }
  );
  const phoneInfo =
    phonePayload.phone_info && typeof phonePayload.phone_info === "object"
      ? (phonePayload.phone_info as Record<string, unknown>)
      : null;
  const phone = normalizeChinaPhone(
    typeof phoneInfo?.purePhoneNumber === "string" ? phoneInfo.purePhoneNumber : ""
  );
  if (!isChinaMobilePhone(phone)) {
    throw new WechatProviderError("未能取得有效手机号，请重新授权");
  }

  return { openid, unionid, phone };
}
