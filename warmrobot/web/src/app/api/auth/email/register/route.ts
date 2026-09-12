import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createConsumerSession, hashPassword, sessionCookieOptions } from "@/lib/self-hosted/auth";
import { queryOne } from "@/lib/self-hosted/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: "请输入有效邮箱和至少 8 位密码" }, { status: 400 });
    }
    const id = randomUUID();
    const account = await queryOne<{ id: string }>(
      `WITH created AS (
        INSERT INTO public.app_accounts (id, email, password_hash, display_name)
        VALUES ($1, $2, $3, $2)
        RETURNING id
      ), profile AS (
        INSERT INTO public.profiles (id, display_name)
        SELECT id, $2 FROM created
        RETURNING id
      ) SELECT id FROM created`,
      [id, email, hashPassword(password)]
    );
    if (!account) throw new Error("创建账户失败");
    const token = await createConsumerSession(account.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("warmrobot_session", token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error && /unique|duplicate/i.test(error.message) ? "该邮箱已注册，请直接登录" : "注册暂时不可用，请稍后重试";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
