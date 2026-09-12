import { NextResponse } from "next/server";
import { createConsumerSession, sessionCookieOptions, verifyPassword } from "@/lib/self-hosted/auth";
import { queryOne } from "@/lib/self-hosted/database";

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const email =
      body && typeof body === "object" && "email" in body && typeof body.email === "string"
        ? body.email.trim()
        : "";
    const password =
      body && typeof body === "object" && "password" in body && typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
    }

    const account = await queryOne<{ id: string; password_hash: string | null }>(
      "SELECT id, password_hash FROM public.app_accounts WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );
    if (!account?.password_hash || !verifyPassword(password, account.password_hash)) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }
    const token = await createConsumerSession(account.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("warmrobot_session", token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[email-login]", error);
    return NextResponse.json({ error: "登录服务暂时不可用" }, { status: 503 });
  }
}
