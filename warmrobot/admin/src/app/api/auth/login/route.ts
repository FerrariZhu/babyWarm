import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  adminSessionCookieOptions,
  createAdminSession,
  isAdminEmail,
} from "@/lib/self-hosted/auth";
import { queryOne } from "@/lib/self-hosted/database";
import { verifyPassword } from "@/lib/self-hosted/password";

export const runtime = "nodejs";

type LoginAccount = { id: string; email: string | null; password_hash: string | null };

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const email =
      body && typeof body === "object" && "email" in body && typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password =
      body && typeof body === "object" && "password" in body && typeof body.password === "string"
        ? body.password
        : "";

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length === 0 || password.length > 256) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const account = await queryOne<LoginAccount>(
      `SELECT id, email, password_hash
         FROM public.app_accounts
        WHERE email = $1 AND is_active = true`,
      [email]
    );
    if (!account?.email || !account.password_hash || !isAdminEmail(account.email) || !verifyPassword(password, account.password_hash)) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const token = await createAdminSession(account.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, adminSessionCookieOptions());
    return response;
  } catch {
    console.error("[admin-login] authentication service unavailable");
    return NextResponse.json({ error: "登录服务暂时不可用" }, { status: 503 });
  }
}
