import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { queryOne } from "@/lib/self-hosted/database";
import { isBabyGender, isWarmthPreference, isWearsDiaperChoice, wearsDiaperFromChoice } from "@/lib/baby-profile";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const name = body.name != null ? String(body.name).trim() : "";
  const birthDate = body.birth_date;
  const gender = body.gender != null ? String(body.gender) : "";
  const warmthPreference =
    body.warmth_preference != null ? String(body.warmth_preference) : "";

  if (!name) {
    return NextResponse.json({ error: "请输入宝宝名字" }, { status: 400 });
  }
  if (!birthDate || typeof birthDate !== "string") {
    return NextResponse.json({ error: "请选择生日" }, { status: 400 });
  }
  if (!isBabyGender(gender)) {
    return NextResponse.json({ error: "请选择性别" }, { status: 400 });
  }
  if (!isWarmthPreference(warmthPreference)) {
    return NextResponse.json({ error: "请选择温度偏好" }, { status: 400 });
  }
  const wearsDiaperRaw = body.wears_diaper != null ? String(body.wears_diaper) : "";
  if (!isWearsDiaperChoice(wearsDiaperRaw)) {
    return NextResponse.json({ error: "请选择是否仍穿尿布" }, { status: 400 });
  }
  const wearsDiaper = wearsDiaperFromChoice(wearsDiaperRaw);

  const heightCm = Number(body.height_cm);
  const weightKg = Number(body.weight_kg);
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return NextResponse.json({ error: "请输入有效身高" }, { status: 400 });
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return NextResponse.json({ error: "请输入有效体重" }, { status: 400 });
  }

  const suggestedSize = suggestBabyCurrentSize({ birthDate });

  try {
    const baby = await queryOne<{
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
      `WITH created_baby AS (
         INSERT INTO public.babies
           (user_id, name, birth_date, gender, activity_level, is_active, height_cm, weight_kg,
            avatar_url, wears_diaper, current_size_label, current_size_updated_at)
         VALUES ($1, $2, $3, $4, 'low', true, $5, $6, $7, $8, $9, CASE WHEN $9 IS NULL THEN NULL ELSE now() END)
         RETURNING id, name, birth_date, gender, avatar_url, height_cm, weight_kg, current_size_label, wears_diaper
       ), created_preference AS (
         INSERT INTO public.baby_warmth_preferences (baby_id, warmth_preference)
         SELECT id, $10 FROM created_baby
       )
       SELECT id, name, birth_date, gender, avatar_url, height_cm, weight_kg, current_size_label, wears_diaper
       FROM created_baby`,
      [
        user.id,
        name,
        birthDate,
        gender,
        heightCm,
        weightKg,
        typeof body.avatar_url === "string" ? body.avatar_url : null,
        wearsDiaper,
        suggestedSize,
        warmthPreference,
      ]
    );
    if (!baby) throw new Error("创建宝宝档案未返回记录");
    return NextResponse.json({ ...baby, warmth_preference: warmthPreference });
  } catch (error) {
    console.error("[babies/create]", error);
    return NextResponse.json({ error: "创建宝宝档案失败" }, { status: 500 });
  }
}
