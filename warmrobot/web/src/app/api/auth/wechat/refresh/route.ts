import { NextResponse } from "next/server";
import { rotateMiniProgramSession } from "@/lib/self-hosted/mini-program-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
    if (!refreshToken) return NextResponse.json({ error: "缺少刷新令牌" }, { status: 400 });

    if (refreshToken.length < 32 || refreshToken.length > 256) {
      return NextResponse.json({ error: "刷新令牌无效" }, { status: 400 });
    }

    const session = await rotateMiniProgramSession(refreshToken);
    if (!session) {
      return NextResponse.json({ error: "登录已过期，请重新登录" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error) {
    console.error("[wechat-refresh]", error);
    return NextResponse.json({ error: "刷新登录状态失败" }, { status: 503 });
  }
}
