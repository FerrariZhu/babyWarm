import { NextResponse } from "next/server";
import { buildBriefAdvice, formatAdviceConclusion, type VariantSlimRow } from "@warmrobot/core";
import { listBabyProfiles } from "@/lib/babies/list-babies";
import { getMiniProgramDailyBrief, MiniProgramBriefError } from "@/lib/miniprogram/daily-brief";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { query, queryOne } from "@/lib/self-hosted/database";
import { getWeatherForProfile } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const babyId = new URL(request.url).searchParams.get("babyId");
    const result = await getMiniProgramDailyBrief(user.id, babyId, {
      listBabies: (userId) => listBabyProfiles(query, userId),
      loadProfile: (userId) => queryOne(
        "SELECT city, latitude, longitude FROM public.profiles WHERE id = $1", [userId]
      ),
      loadVariants: () => query<VariantSlimRow>(
        `SELECT v.category_code, v.warmth_value::float8 AS warmth_value,
                v.consumer_label, v.consumer_label_en, v.sort_order, v.is_active,
                c.outfit_slot, v.material, v.thickness, v.fit_type, v.hat_kind,
                v.bodysuit_style, v.pant_length, v.sock_height, v.fill_type, v.pros, v.cons
           FROM public.garment_variants v
           JOIN public.categories c ON c.code = v.category_code AND c.is_active = true
          WHERE v.is_active = true
          ORDER BY v.sort_order ASC, v.id ASC`
      ),
      getWeather: getWeatherForProfile,
      buildAdvice: buildBriefAdvice,
      conclusion: ({ weather, advice, baby }) => formatAdviceConclusion({
        weather,
        requiredWarmth: advice.current.requiredWarmth,
        outfitItems: advice.current.outfitItems,
        ageMonths: advice.babyAgeMonths,
        wearsDiaper: baby.wears_diaper,
      }),
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof MiniProgramBriefError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[miniprogram/daily-brief]", error);
    return NextResponse.json({ error: "穿搭建议暂时不可用，请稍后重试" }, { status: 503 });
  }
}
