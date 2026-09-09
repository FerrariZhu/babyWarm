import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
    if (!refreshToken) return NextResponse.json({ error: "缺少刷新令牌" }, { status: 400 });

    const { url, key } = getSupabaseEnv();
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      return NextResponse.json({ error: "登录已过期，请重新登录" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
    });
  } catch {
    return NextResponse.json({ error: "刷新登录状态失败" }, { status: 400 });
  }
}
