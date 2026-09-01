import { requireUser } from "@/lib/supabase/session";
import type { AuthenticatedSession } from "@/lib/supabase/session";

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

export async function requireAdmin(): Promise<AuthenticatedSession | null> {
  const session = await requireUser();
  if (!session) return null;
  if (!isAdminEmail(session.user.email)) return null;
  return session;
}
