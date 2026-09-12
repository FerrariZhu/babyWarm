import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { query, queryOne } from "@/lib/self-hosted/database";
import { isBabyGender, isWarmthPreference, isWearsDiaperChoice, wearsDiaperFromChoice } from "@/lib/baby-profile";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.birth_date !== undefined) updates.birth_date = body.birth_date;
  if (body.gender !== undefined) {
    if (!isBabyGender(String(body.gender))) {
      return NextResponse.json({ error: "无效的性别" }, { status: 400 });
    }
    updates.gender = body.gender;
  }
  if (body.height_cm !== undefined) {
    const heightCm = Number(body.height_cm);
    if (!Number.isFinite(heightCm) || heightCm <= 0) {
      return NextResponse.json({ error: "请输入有效身高" }, { status: 400 });
    }
    updates.height_cm = heightCm;
  }
  if (body.weight_kg !== undefined) {
    const weightKg = Number(body.weight_kg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return NextResponse.json({ error: "请输入有效体重" }, { status: 400 });
    }
    updates.weight_kg = weightKg;
  }
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
  if (body.wears_diaper !== undefined) {
    const choice = String(body.wears_diaper);
    if (!isWearsDiaperChoice(choice)) {
      return NextResponse.json({ error: "请选择是否仍穿尿布" }, { status: 400 });
    }
    updates.wears_diaper = wearsDiaperFromChoice(choice);
  }

  const nextBirthDate =
    updates.birth_date !== undefined ? String(updates.birth_date) : undefined;

  const hasBabyUpdates = Object.keys(updates).length > 0;
  const warmthPreference =
    body.warmth_preference !== undefined ? String(body.warmth_preference) : null;

  if (!hasBabyUpdates && warmthPreference == null) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (warmthPreference != null && !isWarmthPreference(warmthPreference)) {
    return NextResponse.json({ error: "无效的温度偏好" }, { status: 400 });
  }

  const existingBaby = await queryOne<{ birth_date: string }>(
    "SELECT birth_date FROM public.babies WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (!existingBaby) {
    return NextResponse.json({ error: "找不到宝宝档案" }, { status: 404 });
  }

  if (updates.birth_date !== undefined) {
    const suggestedSize = suggestBabyCurrentSize({
      birthDate: nextBirthDate ?? existingBaby.birth_date,
    });
    if (suggestedSize) {
      updates.current_size_label = suggestedSize;
      updates.current_size_updated_at = new Date().toISOString();
    }
  }

  if (hasBabyUpdates) {
    try {
      await query(
        `UPDATE public.babies
            SET name = CASE WHEN $1 THEN $2 ELSE name END,
                birth_date = CASE WHEN $3 THEN $4::date ELSE birth_date END,
                gender = CASE WHEN $5 THEN $6::text ELSE gender END,
                height_cm = CASE WHEN $7 THEN $8 ELSE height_cm END,
                weight_kg = CASE WHEN $9 THEN $10 ELSE weight_kg END,
                avatar_url = CASE WHEN $11 THEN $12 ELSE avatar_url END,
                wears_diaper = CASE WHEN $13 THEN $14 ELSE wears_diaper END,
                current_size_label = CASE WHEN $15 THEN $16 ELSE current_size_label END,
                current_size_updated_at = CASE WHEN $15 THEN now() ELSE current_size_updated_at END,
                updated_at = now()
          WHERE id = $17 AND user_id = $18`,
        [
          updates.name !== undefined,
          updates.name ?? null,
          updates.birth_date !== undefined,
          updates.birth_date ?? null,
          updates.gender !== undefined,
          updates.gender ?? null,
          updates.height_cm !== undefined,
          updates.height_cm ?? null,
          updates.weight_kg !== undefined,
          updates.weight_kg ?? null,
          updates.avatar_url !== undefined,
          updates.avatar_url ?? null,
          updates.wears_diaper !== undefined,
          updates.wears_diaper ?? null,
          updates.current_size_label !== undefined,
          updates.current_size_label ?? null,
          id,
          user.id,
        ]
      );
      if (updates.wears_diaper !== undefined) {
        await query(
          "DELETE FROM public.home_daily_briefs WHERE baby_id = $1 AND recommended_date = $2",
          [id, localRecommendedDate()]
        );
      }
    } catch (error) {
      console.error("[babies/update]", error);
      return NextResponse.json({ error: "更新宝宝档案失败" }, { status: 500 });
    }
  }

  if (warmthPreference != null) {
    try {
      await query(
        `INSERT INTO public.baby_warmth_preferences (baby_id, warmth_preference)
         VALUES ($1, $2)
         ON CONFLICT (baby_id) DO UPDATE
           SET warmth_preference = EXCLUDED.warmth_preference, updated_at = now()`,
        [id, warmthPreference]
      );
    } catch (error) {
      console.error("[babies/preference]", error);
      return NextResponse.json({ error: "更新温度偏好失败" }, { status: 500 });
    }
  }

  const data = await queryOne<{
    id: string;
    name: string;
    birth_date: string;
    gender: string;
    avatar_url: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    current_size_label: string | null;
    wears_diaper: boolean | null;
  }>(
    `SELECT id, name, birth_date, gender, avatar_url, height_cm, weight_kg, current_size_label, wears_diaper
       FROM public.babies WHERE id = $1 AND user_id = $2`,
    [id, user.id]
  );
  if (!data) return NextResponse.json({ error: "找不到宝宝档案" }, { status: 404 });

  let resolvedPreference = warmthPreference;
  if (resolvedPreference == null) {
    const pref = await queryOne<{ warmth_preference: string | null }>(
      "SELECT warmth_preference FROM public.baby_warmth_preferences WHERE baby_id = $1",
      [id]
    );
    const savedPreference = pref?.warmth_preference ?? "";
    resolvedPreference = isWarmthPreference(savedPreference) ? savedPreference : "neutral";
  }

  return NextResponse.json({ ...data, warmth_preference: resolvedPreference });
}
