import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getBearerToken } from "@/lib/auth/bearer-token";
import { query, queryOne } from "@/lib/self-hosted/database";
import { digestSessionToken } from "@/lib/self-hosted/session-token";

export const SESSION_COOKIE_NAME = "warmrobot_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type AppUser = { id: string; email: string | null; phone: string | null; displayName: string | null };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("base64url");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createConsumerSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO public.app_sessions (principal_kind, principal_id, token_digest, expires_at)
     VALUES ('consumer', $1, $2, now() + interval '14 days')`,
    [accountId, digestSessionToken(token)]
  );
  return token;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await query(
      "UPDATE public.app_sessions SET revoked_at = now() WHERE token_digest = $1 AND revoked_at IS NULL",
      [digestSessionToken(token)]
    );
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");
  const cookieStore = await cookies();
  const token =
    authorization !== null
      ? getBearerToken(authorization)
      : cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!token) return null;
  return queryOne<AppUser>(
    `SELECT a.id, a.email, a.phone, coalesce(p.display_name, a.display_name) AS "displayName"
       FROM public.app_sessions s
       JOIN public.app_accounts a ON a.id = s.principal_id
       LEFT JOIN public.profiles p ON p.id = a.id
      WHERE s.principal_kind = 'consumer'
        AND s.token_digest = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND a.is_active = true`,
    [digestSessionToken(token)]
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
