import type { SupabaseClient } from "@supabase/supabase-js";
import type { LoginChannel } from "./login-channel";

/** Stores the user's most recent successful login channel for admin visibility. */
export async function recordLoginActivity(
  admin: SupabaseClient,
  userId: string,
  channel: LoginChannel
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ last_login_channel: channel, last_login_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
