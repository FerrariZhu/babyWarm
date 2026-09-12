import type { DbBaby, DbProfile } from "@/lib/db/types";
import type { WarmthPreference } from "@/lib/baby-profile";
import { requireUser } from "@/lib/self-hosted/session";
import { query, queryOne } from "@/lib/self-hosted/database";

type ProfileBabyRow = Omit<DbBaby, "birth_date"> & {
  birth_date: string | Date;
  avatar_url?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
};

function toDateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export async function getProfilePageData() {
  const session = await requireUser();
  if (!session) return null;
  const { user } = session;
  const [profile, babies] = await Promise.all([
    queryOne<DbProfile & { avatar_url?: string | null }>("SELECT display_name, city, avatar_url FROM public.profiles WHERE id = $1", [user.id]),
    query<ProfileBabyRow>("SELECT id, name, birth_date, gender, current_size_label, activity_level, is_active, avatar_url, height_cm, weight_kg, wears_diaper FROM public.babies WHERE user_id = $1 ORDER BY is_active DESC", [user.id]),
  ]);

  const babyRow = babies[0];
  const baby = babyRow
    ? { ...babyRow, birth_date: toDateOnly(babyRow.birth_date) }
    : undefined;

  const pref = baby
    ? await queryOne<{ warmth_offset: number | string | null; warmth_preference: string | null }>("SELECT warmth_offset, warmth_preference FROM public.baby_warmth_preferences WHERE baby_id = $1", [baby.id])
    : null;

  return {
    user,
    profile,
    baby,
    warmthOffset: pref?.warmth_offset ? Number(pref.warmth_offset) : 0,
    warmthPreference: (pref?.warmth_preference ?? "neutral") as WarmthPreference,
  };
}
