import { NextResponse } from "next/server";
import {
  exchangeWechatCredentials,
  validateWechatLoginPayload,
  WechatProviderError,
} from "@/lib/auth/wechat-provider";
import { createMiniProgramSession } from "@/lib/self-hosted/mini-program-session";
import { ensureSelfHostedWechatUser } from "@/lib/self-hosted/wechat-account";

/**
 * WeChat mini-program login entry (production path).
 * Exchange wx.login and getPhoneNumber codes server-side, then establish an
 * opaque local session backed only by self-hosted PostgreSQL.
 */
export async function POST(request: Request) {
  const appId = process.env.WECHAT_APP_ID?.trim();
  const appSecret = process.env.WECHAT_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return NextResponse.json(
      {
        error: "微信登录尚未配置（WECHAT_APP_ID / WECHAT_APP_SECRET）",
        hint: "请配置微信小程序凭证后重试",
      },
      { status: 501 }
    );
  }

  try {
    const payload = validateWechatLoginPayload(await request.json());
    const identity = await exchangeWechatCredentials(payload, { appId, appSecret });
    const authUser = await ensureSelfHostedWechatUser(identity);
    const session = await createMiniProgramSession(authUser.userId);

    return NextResponse.json({
      ok: true,
      userId: authUser.userId,
      phone: authUser.phone,
      session,
    });
  } catch (error) {
    if (error instanceof WechatProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求体无效" }, { status: 400 });
    }
    if (error instanceof Error && /请求体|凭证|手机号|绑定/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[wechat-login]", error);
    return NextResponse.json({ error: "登录服务暂时不可用" }, { status: 503 });
  }
}
