interface QueryResult<Row extends object = Record<string, never>> {
  rows: Row[];
}

export interface BabyProfileTransactionClient {
  query<Row extends object = Record<string, never>>(
    statement: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
}

export interface CreateBabyProfileInput {
  userId: string;
  name: string;
  birthDate: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  avatarUrl: string | null;
  wearsDiaper: boolean;
  suggestedSize: string | null;
  warmthPreference: string;
}

export interface CreatedBabyProfile {
  id: string;
  name: string;
  birth_date: string;
  gender: string;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  current_size_label: string | null;
  wears_diaper: boolean | null;
}

export async function createBabyProfile(
  client: BabyProfileTransactionClient,
  input: CreateBabyProfileInput
): Promise<CreatedBabyProfile> {
  await client.query(
    `UPDATE public.babies
        SET is_active = false, updated_at = now()
      WHERE user_id = $1 AND is_active = true`,
    [input.userId]
  );

  const created = await client.query<CreatedBabyProfile>(
    `INSERT INTO public.babies
       (user_id, name, birth_date, gender, activity_level, is_active, height_cm, weight_kg,
        avatar_url, wears_diaper, current_size_label, current_size_updated_at)
     VALUES ($1, $2, $3, $4, 'low', true, $5, $6, $7, $8, $9,
             CASE WHEN $9::text IS NULL THEN NULL ELSE now() END)
     RETURNING id, name, birth_date, gender, avatar_url, height_cm, weight_kg,
               current_size_label, wears_diaper`,
    [
      input.userId,
      input.name,
      input.birthDate,
      input.gender,
      input.heightCm,
      input.weightKg,
      input.avatarUrl,
      input.wearsDiaper,
      input.suggestedSize,
    ]
  );
  const baby = created.rows[0];
  if (!baby) throw new Error("创建宝宝档案未返回记录");

  await client.query(
    `INSERT INTO public.baby_warmth_preferences (baby_id, warmth_preference)
     VALUES ($1, $2)`,
    [baby.id, input.warmthPreference]
  );

  return baby;
}
