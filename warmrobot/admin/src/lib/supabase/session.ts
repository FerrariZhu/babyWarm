import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthenticatedSession = {
  supabase: SupabaseClient;
  user: User;
};

export async function requireUser(): Promise<AuthenticatedSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}
