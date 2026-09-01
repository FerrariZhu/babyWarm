import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { createClient } from "@/lib/supabase/server";
import { isBabyGender, isWarmthPreference, isWearsDiaperChoice, wearsDiaperFromChoice } from "@/lib/baby-profile";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  if (updates.birth_date !== undefined) {
    const { data: existing } = await supabase
      .from("babies")
      .select("birth_date")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const suggestedSize = suggestBabyCurrentSize({
        birthDate: nextBirthDate ?? existing.birth_date,
      });
      if (suggestedSize) {
        updates.current_size_label = suggestedSize;
        updates.current_size_updated_at = new Date().toISOString();
      }
    }
  }

  if (hasBabyUpdates) {
    const { error } = await supabase
      .from("babies")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (updates.wears_diaper !== undefined) {
      await supabase
        .from("home_daily_briefs")
        .delete()
        .eq("baby_id", id)
        .eq("recommended_date", localRecommendedDate());
    }
  }

  if (warmthPreference != null) {
    const { data: existing } = await supabase
      .from("baby_warmth_preferences")
      .select("baby_id")
      .eq("baby_id", id)
      .maybeSingle();

    const prefPayload = { warmth_preference: warmthPreference };
    const { error: prefError } = existing
      ? await supabase.from("baby_warmth_preferences").update(prefPayload).eq("baby_id", id)
      : await supabase.from("baby_warmth_preferences").insert({ baby_id: id, ...prefPayload });

    if (prefError) {
      return NextResponse.json({ error: prefError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("babies")
    .select("id, name, birth_date, gender, avatar_url, height_cm, weight_kg, current_size_label, wears_diaper")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let resolvedPreference = warmthPreference;
  if (resolvedPreference == null) {
    const { data: pref } = await supabase
      .from("baby_warmth_preferences")
      .select("warmth_preference")
      .eq("baby_id", id)
      .maybeSingle();
    resolvedPreference = pref?.warmth_preference ?? "neutral";
  }

  return NextResponse.json({ ...data, warmth_preference: resolvedPreference });
}
