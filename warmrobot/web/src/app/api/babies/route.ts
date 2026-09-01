import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { createClient } from "@/lib/supabase/server";
import { isBabyGender, isWarmthPreference, isWearsDiaperChoice, wearsDiaperFromChoice } from "@/lib/baby-profile";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { data: baby, error: babyError } = await supabase
    .from("babies")
    .insert({
      user_id: user.id,
      name,
      birth_date: birthDate,
      gender,
      activity_level: "low",
      is_active: true,
      height_cm: heightCm,
      weight_kg: weightKg,
      avatar_url: body.avatar_url || null,
      wears_diaper: wearsDiaper,
      current_size_label: suggestedSize,
      current_size_updated_at: suggestedSize ? new Date().toISOString() : null,
    })
    .select("id, name, birth_date, gender, avatar_url, height_cm, weight_kg, current_size_label, wears_diaper")
    .single();

  if (babyError) {
    return NextResponse.json({ error: babyError.message }, { status: 500 });
  }

  const { error: prefError } = await supabase.from("baby_warmth_preferences").insert({
    baby_id: baby.id,
    warmth_preference: warmthPreference,
  });

  if (prefError) {
    await supabase.from("babies").delete().eq("id", baby.id);
    return NextResponse.json({ error: prefError.message }, { status: 500 });
  }

  return NextResponse.json({ ...baby, warmth_preference: warmthPreference });
}
