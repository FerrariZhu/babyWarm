import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureWechatUser,
  validateWechatAuthInput,
  wechatAuthPassword,
} from "@/lib/auth/wechat-user";
import { getSupabaseEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * WeChat mini-program login entry (production path).
 * Expects server-side code→openid exchange once WECHAT_APP_ID/SECRET are configured.
 * Until then, returns 501 with guidance; local dev should use /api/auth/wechat/mock.
 */
export async function POST(request: Request) {
  const appId = process.env.WECHAT_APP_ID?.trim();
  const appSecret = process.env.WECHAT_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return NextResponse.json(
      {
        error: "微信登录尚未配置（WECHAT_APP_ID / WECHAT_APP_SECRET）",
        hint: "本地开发请使用 /api/auth/wechat/mock",
      },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "缺少 wx.login code" }, { status: 400 });
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

    const input = validateWechatAuthInput({
      openid: tokenJson.openid,
      wechat_id: body.wechat_id,
      phone: body.phone,
      display_name: body.display_name,
    });

    const admin = createServiceClient();
    const authUser = await ensureWechatUser(admin, input);

    const cookieStore = await cookies();
    const { url, key } = getSupabaseEnv();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    const { error } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: wechatAuthPassword(input.openid),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      userId: authUser.userId,
      wechat_id: input.wechat_id,
      phone: input.phone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "微信登录失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
