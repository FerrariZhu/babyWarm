import {
  getCurrentAdminSession,
  isAdminEmail,
  type AuthenticatedAdminSession,
} from "@/lib/self-hosted/auth";

export { isAdminEmail };

export async function requireAdmin(): Promise<AuthenticatedAdminSession | null> {
  return getCurrentAdminSession();
}
