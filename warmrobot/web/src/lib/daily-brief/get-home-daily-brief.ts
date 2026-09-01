import {
  buildBriefAdvice,
  groupVariantCopyByCategory,
  isBriefAdviceCurrent,
  mapVariantCopyRow,
  reverseGeocode,
  type BabyProfile,
  type HomeDailyBrief,
  type VariantCopyCard,
  type VariantCopyRow,
  type VariantSlimRow,
  type WeatherResult,
} from "@warmrobot/core";
import type { DbBaby, DbProfile } from "@/lib/db/types";
import { requireUser } from "@/lib/supabase/session";
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
  const { supabase, user } = session;
  const force = options?.force ?? false;
  const hourOverride = resolveHourOverride(options?.at);
  const persistBrief = !hourOverride;
  const recommendedDate = localRecommendedDate();

  const [{ data: profile }, { data: babies }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, city, latitude, longitude")
      .eq("id", user.id)
      .single<DbProfile>(),
    supabase
      .from("babies")
      .select(
        "id, name, birth_date, gender, activity_level, current_size_label, is_active, avatar_url, height_cm, weight_kg, wears_diaper, diaper_prompt_last_shown_at, diaper_prompt_last_answered_at, diaper_prompt_last_answer"
      )
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  const baby = babies?.[0] as DbBaby | undefined;
  // Load active garment variants + category outfit_slot for advice engine
  const [
    { data: variantRows },
    { data: categoryRows },
  ] = await Promise.all([
      supabase
        .from("garment_variants")
        .select(
          "id, category_code, warmth_value, consumer_label, consumer_label_en, sort_order, is_active, material, thickness, fit_type, sock_height, bodysuit_style, pant_length, fill_type, hat_kind, pros, cons, usage_tips"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("categories").select("code, outfit_slot").eq("is_active", true),
    ]);

  const variantCopyByCategory = groupVariantCopyByCategory(
    ((variantRows ?? []) as VariantCopyRow[]).map((row) => mapVariantCopyRow(row))
  );

  const slotByCode = new Map(
    (categoryRows ?? []).map((c) => [c.code as string, c.outfit_slot as string | null])
  );
  const variants = ((variantRows ?? []) as Omit<VariantSlimRow, "outfit_slot">[]).map(
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
      savedToday: false,
    };
  }

  const [{ data: pref }, { data: existing }, { data: savedRow }, weatherResult] =
    await Promise.all([
      supabase
        .from("baby_warmth_preferences")
        .select("warmth_offset")
        .eq("baby_id", baby.id)
        .maybeSingle(),
      supabase
        .from("home_daily_briefs")
        .select("brief, generated_at")
        .eq("baby_id", baby.id)
        .eq("recommended_date", recommendedDate)
        .maybeSingle(),
      supabase
        .from("dressing_records")
        .select("id")
        .eq("baby_id", baby.id)
        .eq("recorded_date", recommendedDate)
        .maybeSingle(),
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

  const { error } = persistBrief
    ? await supabase.from("home_daily_briefs").upsert(
        {
          user_id: user.id,
          baby_id: baby.id,
          recommended_date: recommendedDate,
          brief,
          generated_at: brief.generatedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "baby_id,recommended_date" }
      )
    : { error: null };

  if (error) {
    console.error("[getHomeDailyBrief] upsert failed:", error.message);
  }

  return {
    user,
    profile,
    baby,
    brief,
    observedAtDisplay: formatObservedAtDisplay(brief.weather.observedAt),
    variantCopyByCategory,
    savedToday,
  };
}
