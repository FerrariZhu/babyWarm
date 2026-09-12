import { NextResponse } from "next/server";
import {
  buildDressingRecordFromAdvice,
  mapDressingRecordRow,
  parseSaveDressingRecordInput,
  type DressingRecordRow,
} from "@warmrobot/core";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { queryOne } from "@/lib/self-hosted/database";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = parseSaveDressingRecordInput(parsedBody.body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const baby = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM public.babies WHERE id = $1 AND user_id = $2",
    [parsed.data.babyId, user.id]
  );
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

  try {
    const data = await queryOne<DressingRecordRow>(
      `INSERT INTO public.dressing_records
        (user_id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       ON CONFLICT (baby_id, recorded_date) DO UPDATE
         SET user_id = EXCLUDED.user_id, baby_name = EXCLUDED.baby_name, saved_at = EXCLUDED.saved_at,
             required_warmth = EXCLUDED.required_warmth, reason = EXCLUDED.reason,
             location_label = EXCLUDED.location_label, weather = EXCLUDED.weather, outfit = EXCLUDED.outfit,
             updated_at = now()
       WHERE dressing_records.user_id = $1
       RETURNING id, user_id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit`,
      [
        user.id,
        snapshot.babyId,
        snapshot.babyName,
        snapshot.recordedDate,
        snapshot.savedAt,
        snapshot.requiredWarmth,
        snapshot.reason || null,
        snapshot.locationLabel ?? null,
        snapshot.weather == null ? null : JSON.stringify(snapshot.weather),
        JSON.stringify(snapshot.outfit),
      ]
    );
    if (!data) {
      return NextResponse.json({ error: "该日期的记录不属于当前用户" }, { status: 409 });
    }
    return NextResponse.json({
      success: true,
      data: mapDressingRecordRow(data),
    });
  } catch (error) {
    console.error("[dressing-records/save]", error);
    return NextResponse.json({ error: "保存穿衣记录失败" }, { status: 500 });
  }
}
