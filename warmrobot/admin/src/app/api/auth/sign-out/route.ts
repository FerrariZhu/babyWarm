import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  adminSessionCookieOptions,
  revokeCurrentAdminSession,
} from "@/lib/self-hosted/auth";

export const runtime = "nodejs";

export async function POST() {
  await revokeCurrentAdminSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
