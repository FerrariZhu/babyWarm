import type { BabyProfile, BriefAdvice, VariantSlimRow, WeatherResult } from "@warmrobot/core";
import type { BabyProfileSummary } from "../babies/list-babies";

type LocationProfile = { city: string | null; latitude: number | null; longitude: number | null };
type AdviceInput = {
  weather: WeatherResult;
  baby: Pick<BabyProfile, "birthDate" | "activityLevel" | "warmthOffset" | "heightCm" | "weightKg" | "wearsDiaper">;
  variants: VariantSlimRow[];
};

export interface MiniProgramBriefDependencies {
  listBabies: (userId: string) => Promise<BabyProfileSummary[]>;
  loadProfile: (userId: string) => Promise<LocationProfile | null>;
  loadVariants: () => Promise<VariantSlimRow[]>;
  getWeather: (profile: LocationProfile) => Promise<WeatherResult | null>;
  buildAdvice: (input: AdviceInput) => BriefAdvice;
  conclusion: (input: { weather: WeatherResult; advice: BriefAdvice; baby: BabyProfileSummary }) => string;
}

export class MiniProgramBriefError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MiniProgramBriefError";
    this.status = status;
  }
}

export interface MiniProgramBrief {
  status: "ready" | "needs_baby" | "needs_location" | "weather_unavailable";
  babies: BabyProfileSummary[];
  baby: BabyProfileSummary | null;
  weather: WeatherResult | null;
  advice: BriefAdvice | null;
  conclusion: string;
  recommendedDate: string;
  generatedAt: string;
}

function hasLocation(profile: LocationProfile | null): profile is LocationProfile {
  if (!profile) return false;
  const { latitude, longitude } = profile;
  const hasCoordinates = latitude != null && longitude != null
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    && Number(latitude) >= -90 && Number(latitude) <= 90
    && Number(longitude) >= -180 && Number(longitude) <= 180;
  return hasCoordinates || Boolean(profile.city?.trim());
}

/** Read-only assembly. Never use a client's weather or a baby outside its owner's list. */
export async function getMiniProgramDailyBrief(
  userId: string,
  requestedBabyId: string | null,
  dependencies: MiniProgramBriefDependencies,
  now = new Date()
): Promise<MiniProgramBrief> {
  if (requestedBabyId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedBabyId)) {
    throw new MiniProgramBriefError("宝宝档案编号无效", 400);
  }
  const babies = await dependencies.listBabies(userId);
  const baby = requestedBabyId === null ? babies[0] ?? null
    : babies.find((candidate) => candidate.id.toLowerCase() === requestedBabyId.toLowerCase()) ?? null;
  if (requestedBabyId !== null && !baby) {
    throw new MiniProgramBriefError("找不到宝宝档案", 404);
  }
  const result: MiniProgramBrief = {
    status: "needs_baby", babies, baby, weather: null, advice: null, conclusion: "",
    recommendedDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now),
    generatedAt: now.toISOString(),
  };
  if (!baby) return result;

  const profile = await dependencies.loadProfile(userId);
  if (!hasLocation(profile)) return { ...result, status: "needs_location" };
  const weather = await dependencies.getWeather(profile);
  if (!weather) return { ...result, status: "weather_unavailable" };

  const variants = await dependencies.loadVariants();
  const advice = dependencies.buildAdvice({
    weather,
    baby: {
      birthDate: baby.birth_date,
      activityLevel: baby.activity_level,
      warmthOffset: Number(baby.warmth_offset) || 0,
      heightCm: baby.height_cm,
      weightKg: baby.weight_kg,
      wearsDiaper: baby.wears_diaper,
    },
    variants,
  });
  return {
    ...result, status: "ready", weather, advice,
    conclusion: dependencies.conclusion({ weather, advice, baby }),
  };
}
