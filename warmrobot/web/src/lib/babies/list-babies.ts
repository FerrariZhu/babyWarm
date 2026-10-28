import type { ActivityLevel } from "@warmrobot/core";

/** Only parent-facing fields are returned; never expose the owning user ID. */
export interface BabyProfileSummary {
  id: string;
  name: string;
  birth_date: string;
  gender: string | null;
  activity_level: ActivityLevel;
  current_size_label: string | null;
  is_active: boolean;
  height_cm: number | null;
  weight_kg: number | null;
  wears_diaper: boolean | null;
  warmth_preference: string;
  warmth_offset: number;
}

export type BabyProfileQuery = <T extends object>(statement: string, values: unknown[]) => Promise<T[]>;

export function listBabyProfiles(query: BabyProfileQuery, userId: string): Promise<BabyProfileSummary[]> {
  return query<BabyProfileSummary>(
    `SELECT b.id, b.name, b.birth_date::text AS birth_date, b.gender,
            b.activity_level, b.current_size_label, b.is_active,
            b.height_cm::float8 AS height_cm, b.weight_kg::float8 AS weight_kg,
            b.wears_diaper, COALESCE(p.warmth_preference, 'neutral') AS warmth_preference,
            COALESCE(p.warmth_offset, 0)::float8 AS warmth_offset
       FROM public.babies b
       LEFT JOIN public.baby_warmth_preferences p ON p.baby_id = b.id
      WHERE b.user_id = $1
      ORDER BY b.is_active DESC, b.created_at ASC, b.id ASC`,
    [userId]
  );
}
