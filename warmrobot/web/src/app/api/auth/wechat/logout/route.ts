import { NextResponse } from "next/server";
import { queryOne } from "@/lib/self-hosted/database";
import {
  MiniProgramLogoutError,
  parseMiniProgramLogoutBearer,
  revokeMiniProgramSessionPair,
} from "@/lib/self-hosted/mini-program-logout";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const accessToken = parseMiniProgramLogoutBearer(request.headers.get("authorization"));
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new MiniProgramLogoutError("请求体无效", 400);
    }
    const refreshToken = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).refresh_token
      : undefined;
    const revoked = await revokeMiniProgramSessionPair(accessToken, refreshToken, queryOne);
    if (!revoked) {
      return NextResponse.json(
        { error: "登录凭证无效" }, { status: 401, headers: responseHeaders }
      );
    }
    return NextResponse.json({ ok: true, revoked: true }, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof MiniProgramLogoutError) {
      return NextResponse.json(
        { error: error.message }, { status: error.status, headers: responseHeaders }
      );
    }
    // Do not log a database error object: driver errors can include query parameters.
    console.error("[wechat-logout] session revocation failed");
    return NextResponse.json(
      { error: "退出登录暂时不可用，请稍后重试" }, { status: 503, headers: responseHeaders }
    );
  }
}
