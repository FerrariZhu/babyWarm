import { NextResponse } from "next/server";
import {
  buildDressingRecordFromAdvice,
  mapDressingRecordRow,
  parseSaveDressingRecordInput,
  type DressingRecordRow,
} from "@warmrobot/core";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = parseSaveDressingRecordInput(parsedBody.body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data: baby, error: babyError } = await supabase
    .from("babies")
    .select("id, name")
    .eq("id", parsed.data.babyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (babyError) {
    return NextResponse.json({ error: babyError.message }, { status: 500 });
  }
  if (!baby) {
    return NextResponse.json({ error: "找不到宝宝档案" }, { status: 404 });
  }

  const recordedDate = localRecommendedDate();
  const snapshot = buildDressingRecordFromAdvice({
    babyId: baby.id,
    babyName: parsed.data.babyName || baby.name,
    recordedDate,
    savedAt: new Date().toISOString(),
    advice: parsed.data.advice,
    weather: parsed.data.weather,
  });

  const { data, error } = await supabase
    .from("dressing_records")
    .upsert(
      {
        user_id: user.id,
        baby_id: snapshot.babyId,
        baby_name: snapshot.babyName,
        recorded_date: snapshot.recordedDate,
        saved_at: snapshot.savedAt,
        required_warmth: snapshot.requiredWarmth,
        reason: snapshot.reason || null,
        location_label: snapshot.locationLabel ?? null,
        weather: snapshot.weather ?? null,
        outfit: snapshot.outfit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "baby_id,recorded_date" }
    )
    .select(
      "id, user_id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: mapDressingRecordRow(data as DressingRecordRow),
  });
}
