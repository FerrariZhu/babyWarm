import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { isConfiguredAdminEmail, parseAdminEmails } from "@/lib/self-hosted/admin-auth-policy.mjs";
import { query, queryOne } from "@/lib/self-hosted/database";

export const ADMIN_SESSION_COOKIE_NAME = "warmrobot_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AuthenticatedAdminSession = {
  user: AdminUser;
};

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return isConfiguredAdminEmail(
    email,
    new Set([
      ...parseAdminEmails(process.env.ADMIN_EMAILS),
      ...parseAdminEmails(process.env.SELF_HOSTED_ADMIN_EMAILS),
    ])
  );
}

export async function createAdminSession(accountId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO public.app_sessions (principal_kind, principal_id, token_digest, expires_at)
     VALUES ('staff', $1, $2, now() + interval '8 hours')`,
    [accountId, tokenDigest(token)]
  );
  return token;
}

export async function getCurrentAdminSession(): Promise<AuthenticatedAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const user = await queryOne<AdminUser>(
    `SELECT a.id, a.email, a.display_name AS "displayName"
       FROM public.app_sessions s
       JOIN public.app_accounts a ON a.id = s.principal_id
      WHERE s.principal_kind = 'staff'
        AND s.token_digest = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND a.is_active = true`,
    [tokenDigest(token)]
  );

  if (!user || !isAdminEmail(user.email)) return null;

  await query(
    `UPDATE public.app_sessions SET last_seen_at = now()
      WHERE principal_kind = 'staff' AND token_digest = $1 AND revoked_at IS NULL`,
    [tokenDigest(token)]
  );
  return { user };
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return;

  await query(
    `UPDATE public.app_sessions SET revoked_at = now()
      WHERE principal_kind = 'staff' AND token_digest = $1 AND revoked_at IS NULL`,
    [tokenDigest(token)]
  );
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
