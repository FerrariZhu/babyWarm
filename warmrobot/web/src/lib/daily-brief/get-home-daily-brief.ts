import {
  buildBriefAdvice,
  attachGuideVisualAssets,
  CATEGORY_GUIDE_VISUAL_AXIS,
  CATEGORY_GUIDE_VISUAL_VALUE,
  groupVariantCopyByCategory,
  groupCategoryGuidesByCategory,
  isBriefAdviceCurrent,
  mapCategoryGuideRow,
  mapVariantCopyRow,
  reverseGeocode,
  type BabyProfile,
  type CategoryIconMeta,
  type HomeDailyBrief,
  type VariantCopyCard,
  type VariantCopyRow,
  type VariantSlimRow,
  type CategoryGuideContent,
  type CategoryGuideRow,
  type GuideVisualAsset,
  type WeatherResult,
} from "@warmrobot/core";
import type { DbBaby, DbProfile } from "@/lib/db/types";
import { requireUser } from "@/lib/supabase/session";
import { query, queryOne } from "@/lib/self-hosted/database";
import { getWeatherForProfile } from "@/lib/weather";
import { hasValidCoordinates } from "@/lib/geo";
import {
  formatObservedAtDisplay,
  isBriefStale,
  localRecommendedDate,
  resolveHourOverride,
} from "@/lib/daily-brief/format";

export type HomeDailyBriefPageData = {
  user: { id: string };
  profile: DbProfile | null;
  baby: DbBaby | null;
  brief: HomeDailyBrief | null;
  /** Preformatted observation time for UI */
  observedAtDisplay: string | null;
  /** Variant pros/cons cards for checklist half-sheet, keyed by category code. */
  variantCopyByCategory: Record<string, VariantCopyCard[]>;
  /** Parent-facing guide content by category, including category / style / material levels. */
  categoryGuideByCategory: Record<string, CategoryGuideContent>;
  /** Category icons from DB for checklist cards. */
  categoryIcons: Record<string, CategoryIconMeta>;
  /** Whether the active baby already has a dressing record for today. */
  savedToday: boolean;
};

async function resolveLocationLabel(
  profile: Pick<DbProfile, "city" | "latitude" | "longitude"> | null,
  weather: WeatherResult
): Promise<string> {
  if (hasValidCoordinates(profile?.latitude, profile?.longitude)) {
    try {
      const geo = await reverseGeocode(
        Number(profile!.latitude),
        Number(profile!.longitude)
      );
      if (geo.name) return geo.name;
    } catch (error) {
      console.error("[getHomeDailyBrief] reverseGeocode", error);
    }
  }
  if (profile?.city?.trim()) return profile.city.trim();
  if (weather.location?.name) return weather.location.name;
  return "当前位置";
}

function toBabyProfile(baby: DbBaby, warmthOffset: number): BabyProfile {
  return {
    id: baby.id,
    name: baby.name,
    birthDate: baby.birth_date,
    activityLevel: baby.activity_level,
    currentSizeLabel: baby.current_size_label,
    warmthOffset,
    heightCm: baby.height_cm ?? null,
    weightKg: baby.weight_kg ?? null,
    wearsDiaper: baby.wears_diaper ?? null,
  };
}

function defaultBabyProfileForAdvice(): Pick<BabyProfile, "birthDate" | "activityLevel" | "warmthOffset"> {
  const birth = new Date();
  birth.setMonth(birth.getMonth() - 12);
  return {
    birthDate: birth.toISOString().slice(0, 10),
    activityLevel: "low",
    warmthOffset: 0,
  };
}

async function buildWeatherBrief(input: {
  profile: DbProfile | null;
  weather: WeatherResult;
  recommendedDate: string;
  babyProfile: Pick<
    BabyProfile,
    "birthDate" | "activityLevel" | "warmthOffset" | "heightCm" | "weightKg"
  >;
  babyId: string;
  variants?: VariantSlimRow[];
}): Promise<HomeDailyBrief> {
  const { profile, weather, recommendedDate, babyProfile, babyId, variants } = input;
  const locationLabel = await resolveLocationLabel(profile, weather);
  const advice = buildBriefAdvice({
    weather,
    baby: babyProfile,
    variants,
  });

  const observedAt =
    weather.observedAt ?? weather.fetchedAt ?? new Date().toISOString();

  return {
    babyId,
    recommendedDate,
    generatedAt: new Date().toISOString(),
    weather: {
      observedAt,
      locationLabel,
      conditionText: weather.text,
      temp: weather.temp,
      feelsLike: weather.feelsLike,
      windSpeed: weather.windSpeed,
      humidity: weather.humidity,
      uvIndex: weather.uvIndex ?? 0,
      precipProbability: weather.precipProbability,
    },
    advice,
  };
}

async function buildBrief(input: {
  baby: DbBaby;
  profile: DbProfile | null;
  warmthOffset: number;
  weather: WeatherResult;
  recommendedDate: string;
  variants?: VariantSlimRow[];
}): Promise<HomeDailyBrief> {
  const { baby, profile, warmthOffset, weather, recommendedDate, variants } = input;
  return buildWeatherBrief({
    profile,
    weather,
    recommendedDate,
    babyProfile: toBabyProfile(baby, warmthOffset),
    babyId: baby.id,
    variants,
  });
}

function canUseCachedBrief(
  cached: HomeDailyBrief | undefined,
  force: boolean
): cached is HomeDailyBrief {
  if (force || !cached) return false;
  if (!isBriefAdviceCurrent(cached.advice)) return false;
  if (isBriefStale(cached)) return false;
  return true;
}

export async function getHomeDailyBriefPageData(options?: {
  force?: boolean;
  at?: string | null;
}): Promise<HomeDailyBriefPageData | null> {
  const session = await requireUser();
  if (!session) return null;
  const { user } = session;
  const force = options?.force ?? false;
  const hourOverride = resolveHourOverride(options?.at);
  const persistBrief = !hourOverride;
  const recommendedDate = localRecommendedDate();

  const [profile, babies] = await Promise.all([
    queryOne<DbProfile>("SELECT display_name, city, latitude, longitude FROM public.profiles WHERE id = $1", [user.id]),
    query<DbBaby>("SELECT id, name, birth_date, gender, activity_level, current_size_label, is_active, avatar_url, height_cm, weight_kg, wears_diaper, diaper_prompt_last_shown_at, diaper_prompt_last_answered_at, diaper_prompt_last_answer FROM public.babies WHERE user_id = $1 ORDER BY is_active DESC, created_at ASC", [user.id]),
  ]);

  const baby = babies[0] as DbBaby | undefined;
  // Load active garment variants + category outfit_slot for advice engine
  const [variantRows, categoryRows, categoryGuideRows, guideVisualRows] = await Promise.all([
    query<VariantCopyRow & Omit<VariantSlimRow, "outfit_slot">>("SELECT id, category_code, warmth_value, consumer_label, consumer_label_en, sort_order, is_active, material, thickness, fit_type, sock_height, bodysuit_style, pant_length, fill_type, hat_kind, pros, cons, usage_tips FROM public.garment_variants WHERE is_active = true ORDER BY sort_order ASC"),
    query<{ code: string; outfit_slot: string | null; icon_key: string | null; icon_url: string | null }>("SELECT code, outfit_slot, icon_key, icon_url FROM public.categories WHERE is_active = true"),
    query<CategoryGuideRow>("SELECT category_code, intro, style_guides, material_guides FROM public.category_guide_contents"),
    query<{ category_code: string; axis: string; value: string; storage_path: string; alt_text: string }>("SELECT category_code, axis, value, storage_path, alt_text FROM public.guide_visual_assets WHERE status = 'approved' ORDER BY created_at ASC"),
  ]);

  const categoryIcons: Record<string, CategoryIconMeta> = {};
  for (const row of categoryRows) {
    const code = row.code;
    categoryIcons[code] = {
      iconKey: (row.icon_key as string | null)?.trim() || "",
      iconUrl: (row.icon_url as string | null)?.trim() || null,
    };
  }

  const variantCopyByCategory = groupVariantCopyByCategory(
    variantRows.map((row) => mapVariantCopyRow(row))
  );
  const guideVisualAssets: GuideVisualAsset[] = guideVisualRows.map((row) => ({
    categoryCode: row.category_code,
    guideKind:
      row.axis === CATEGORY_GUIDE_VISUAL_AXIS && row.value === CATEGORY_GUIDE_VISUAL_VALUE
        ? "category"
        : "style",
    ...(row.axis === CATEGORY_GUIDE_VISUAL_AXIS && row.value === CATEGORY_GUIDE_VISUAL_VALUE
      ? {}
      : { axis: row.axis as NonNullable<GuideVisualAsset["axis"]>, value: row.value }),
    imageUrl: `/api/guide-assets/${row.storage_path.split("/").map(encodeURIComponent).join("/")}`,
    imageAlt: row.alt_text,
  }));
  const categoryGuideByCategory = groupCategoryGuidesByCategory(
    attachGuideVisualAssets(categoryGuideRows.map(mapCategoryGuideRow), guideVisualAssets)
  );

  const slotByCode = new Map(
    categoryRows.map((c) => [c.code, c.outfit_slot])
  );
  const variants = (variantRows as Array<Omit<VariantSlimRow, "outfit_slot">>).map(
    (v) => ({
      ...v,
      outfit_slot: slotByCode.get(v.category_code) ?? null,
    })
  );

  if (!baby) {
    const weatherResult = await getWeatherForProfile(profile, { at: hourOverride });
    if (!weatherResult) {
      return {
        user,
        profile,
        baby: null,
        brief: null,
        observedAtDisplay: null,
        variantCopyByCategory,
        categoryGuideByCategory,
        categoryIcons,
        savedToday: false,
      };
    }

    const brief = await buildWeatherBrief({
      profile,
      weather: weatherResult,
      recommendedDate,
      babyProfile: defaultBabyProfileForAdvice(),
      babyId: "",
      variants,
    });

    return {
      user,
      profile,
      baby: null,
      brief,
      observedAtDisplay: formatObservedAtDisplay(brief.weather.observedAt),
      variantCopyByCategory,
      categoryGuideByCategory,
      categoryIcons,
      savedToday: false,
    };
  }

  const [pref, existing, savedRow, weatherResult] = await Promise.all([
    queryOne<{ warmth_offset: number | string | null }>("SELECT warmth_offset FROM public.baby_warmth_preferences WHERE baby_id = $1", [baby.id]),
    queryOne<{ brief: HomeDailyBrief; generated_at: string }>("SELECT brief, generated_at FROM public.home_daily_briefs WHERE baby_id = $1 AND recommended_date = $2", [baby.id, recommendedDate]),
    queryOne<{ id: string }>("SELECT id FROM public.dressing_records WHERE baby_id = $1 AND recorded_date = $2", [baby.id, recommendedDate]),
    getWeatherForProfile(profile, { at: hourOverride }),
  ]);
  const savedToday = Boolean(savedRow);

  const warmthOffset = pref?.warmth_offset ? Number(pref.warmth_offset) : 0;
  const cached = existing?.brief as HomeDailyBrief | undefined;

  if (persistBrief && canUseCachedBrief(cached, force) && weatherResult) {
    return {
      user,
      profile,
      baby,
      brief: cached,
      observedAtDisplay: formatObservedAtDisplay(cached.weather.observedAt),
      variantCopyByCategory,
      categoryGuideByCategory,
      categoryIcons,
      savedToday,
    };
  }

  if (!weatherResult) {
    if (cached && isBriefAdviceCurrent(cached.advice)) {
      return {
        user,
        profile,
        baby,
        brief: cached,
        observedAtDisplay: formatObservedAtDisplay(cached.weather.observedAt),
        variantCopyByCategory,
        categoryGuideByCategory,
        categoryIcons,
        savedToday,
      };
    }
    return {
      user,
      profile,
      baby,
      brief: null,
      observedAtDisplay: null,
      variantCopyByCategory,
      categoryGuideByCategory,
      categoryIcons,
      savedToday,
    };
  }

  const brief = await buildBrief({
    baby,
    profile,
    warmthOffset,
    weather: weatherResult,
    recommendedDate,
    variants,
  });

  if (persistBrief) {
    try {
      await query(`INSERT INTO public.home_daily_briefs (user_id, baby_id, recommended_date, brief, generated_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, now())
        ON CONFLICT (baby_id, recommended_date) DO UPDATE SET brief = EXCLUDED.brief, generated_at = EXCLUDED.generated_at, updated_at = now()`,
      [user.id, baby.id, recommendedDate, JSON.stringify(brief), brief.generatedAt]);
    } catch (error) {
      console.error("[getHomeDailyBrief] upsert failed:", error);
    }
  }

  return {
    user,
    profile,
    baby,
    brief,
    observedAtDisplay: formatObservedAtDisplay(brief.weather.observedAt),
    variantCopyByCategory,
    categoryGuideByCategory,
    categoryIcons,
    savedToday,
  };
}
