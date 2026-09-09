import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  ensureWechatUser,
  validateWechatAuthInput,
} from "@/lib/auth/wechat-user";
import { platformAuthPassword } from "@/lib/auth/platform-identity";
import { getSupabaseEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { recordLoginActivity } from "@/lib/auth/login-activity";

/**
 * WeChat mini-program login entry (production path).
 * Exchanges both wx.login code and getPhoneNumber code server-side.  A phone
 * typed by the client is never used to choose an account.
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
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const phoneCode = typeof body.phone_code === "string" ? body.phone_code.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "缺少 wx.login code" }, { status: 400 });
    }
    if (!phoneCode) {
      return NextResponse.json({ error: "缺少微信手机号授权凭证" }, { status: 400 });
    }

    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    );
    const tokenJson = (await tokenRes.json()) as {
      openid?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (!tokenJson.openid) {
      return NextResponse.json(
        { error: tokenJson.errmsg ?? "微信 code 换 openid 失败" },
        { status: 400 }
      );
    }

    const accessTokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
    );
    const accessTokenJson = (await accessTokenRes.json()) as {
      access_token?: string;
      errmsg?: string;
    };
    if (!accessTokenJson.access_token) {
      return NextResponse.json({ error: accessTokenJson.errmsg ?? "获取微信服务端凭证失败" }, { status: 502 });
    }

    const phoneRes = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessTokenJson.access_token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: phoneCode }),
      }
    );
    const phoneJson = (await phoneRes.json()) as {
      phone_info?: { purePhoneNumber?: string };
      errmsg?: string;
    };
    const verifiedPhone = phoneJson.phone_info?.purePhoneNumber;
    if (!verifiedPhone) {
      return NextResponse.json({ error: phoneJson.errmsg ?? "微信手机号验证失败" }, { status: 400 });
    }

    const input = validateWechatAuthInput({
      openid: tokenJson.openid,
      wechat_id: body.wechat_id,
      phone: verifiedPhone,
      display_name: body.display_name,
    });

    const admin = createServiceClient();
    const authUser = await ensureWechatUser(admin, input);

    const { url, key } = getSupabaseEnv();
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: platformAuthPassword(authUser.userId),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!signInData.session) {
      return NextResponse.json({ error: "未获取到登录会话" }, { status: 503 });
    }

    await recordLoginActivity(admin, authUser.userId, "wechat_miniprogram");

    return NextResponse.json({
      ok: true,
      userId: authUser.userId,
      wechat_id: input.wechat_id ?? null,
      phone: input.phone,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        expires_in: signInData.session.expires_in,
        token_type: signInData.session.token_type,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "微信登录失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
