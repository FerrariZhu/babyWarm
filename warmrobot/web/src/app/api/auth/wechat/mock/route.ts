import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureWechatUser,
  isWechatMockAuthAllowed,
  validateWechatAuthInput,
  wechatAuthPassword,
} from "@/lib/auth/wechat-user";
import { WECHAT_MOCK_DEFAULTS } from "@/lib/auth/wechat-types";
import { getSupabaseEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

async function signInWechatUser(input: ReturnType<typeof validateWechatAuthInput>) {
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

  if (error) throw error;

  return {
    userId: authUser.userId,
    wechat_id: input.wechat_id,
    phone: input.phone,
  };
}

/** Dev-only: mock WeChat login without real wx.login code exchange. */
export async function POST(request: Request) {
  if (!isWechatMockAuthAllowed()) {
    return NextResponse.json({ error: "Mock 微信登录未启用" }, { status: 403 });
  }

  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const payload =
      body && typeof body === "object" && Object.keys(body as object).length > 0
        ? validateWechatAuthInput(body)
        : validateWechatAuthInput(WECHAT_MOCK_DEFAULTS);

    const session = await signInWechatUser(payload);
    return NextResponse.json({ ok: true, ...session, mock: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "微信 Mock 登录失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
