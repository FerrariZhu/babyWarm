import { getCurrentUser, type AppUser } from "@/lib/self-hosted/auth";

export type AuthenticatedSession = {
  user: AppUser;
};

/** Returns null when the visitor is not signed in. */
export async function requireUser(): Promise<AuthenticatedSession | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { user };
}
