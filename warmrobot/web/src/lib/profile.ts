import type { DbBaby, DbProfile } from "@/lib/db/types";
import { requireUser } from "@/lib/supabase/session";

export async function getProfilePageData() {
  const session = await requireUser();
  if (!session) return null;
  const { supabase, user } = session;

  const [{ data: profile }, { data: babies }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, city, avatar_url")
      .eq("id", user.id)
      .single<DbProfile & { avatar_url?: string | null }>(),
    supabase
      .from("babies")
      .select(
        "id, name, birth_date, gender, current_size_label, activity_level, is_active, avatar_url, height_cm, weight_kg, wears_diaper"
      )
      .eq("user_id", user.id)
      .order("is_active", { ascending: false }),
  ]);

  const baby = babies?.[0] as
    | (DbBaby & { avatar_url?: string | null; height_cm?: number | null; weight_kg?: number | null })
    | undefined;

  const { data: pref } = baby
    ? await supabase
        .from("baby_warmth_preferences")
        .select("warmth_offset, warmth_preference")
        .eq("baby_id", baby.id)
        .maybeSingle()
    : { data: null };

  return {
    user,
    profile,
    baby,
    warmthOffset: pref?.warmth_offset ? Number(pref.warmth_offset) : 0,
    warmthPreference: pref?.warmth_preference ?? "neutral",
  };
}
