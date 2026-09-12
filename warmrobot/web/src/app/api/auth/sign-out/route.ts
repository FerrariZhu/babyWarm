import { NextResponse } from "next/server";
import { revokeCurrentSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/self-hosted/auth";

export async function POST() {
  await revokeCurrentSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
