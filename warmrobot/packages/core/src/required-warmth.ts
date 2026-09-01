import { babyAgeInMonths } from "./baby-age";
import type { ActivityLevel, BabyProfile, Scenario, TimeSlot, WeatherSnapshot } from "./types";
import {
  COLD_STRESS_FEELS_LIKE_C,
  DEFAULT_COLD_FEELS_LIKE_WARMTH,
  FEELS_LIKE_WARMTH_BANDS,
  HUMIDITY_HIGH_THRESHOLD,
  HUMIDITY_HIGH_WARMTH_ADJUST,
  HUMIDITY_LOW_THRESHOLD,
  HUMIDITY_LOW_WARMTH_ADJUST,
  INFANT_AGE_MONTHS,
  INFANT_WARMTH_ADJUST,
  MAX_WARMTH_SCORE,
  MIN_WARMTH_SCORE,
  PRECIP_PROBABILITY_THRESHOLD,
  PRECIP_WARMTH_ADJUST,
  VARIANT_COOLER_ADJUST,
  VARIANT_WARMER_ADJUST,
  WIND_SPEED_WARMTH_THRESHOLD,
  WIND_WARMTH_MULTIPLIER,
  MAX_WIND_WARMTH_ADJUST,
  YOUNG_BABY_AGE_MONTHS,
  YOUNG_BABY_WARMTH_ADJUST,
} from "./warmth-thresholds";

function mapFeelsLikeToWarmth(feelsLike: number): number {
  for (const band of FEELS_LIKE_WARMTH_BANDS) {
    if (feelsLike >= band.minFeelsLike) return band.warmth;
  }
  return DEFAULT_COLD_FEELS_LIKE_WARMTH;
}

export interface RequiredWarmthInput {
  weather: WeatherSnapshot;
  baby: Pick<BabyProfile, "birthDate" | "activityLevel" | "warmthOffset">;
  scenario: Scenario;
  timeSlot?: TimeSlot;
  variant?: "default" | "warmer" | "cooler";
}

export function calcRequiredWarmth(input: RequiredWarmthInput): number {
  const { weather, baby, scenario, timeSlot = "morning", variant = "default" } = input;
  let score = mapFeelsLikeToWarmth(weather.feelsLike);
  const applyColdStressAdjust = weather.feelsLike < COLD_STRESS_FEELS_LIKE_C;

  if (weather.humidity > HUMIDITY_HIGH_THRESHOLD) {
    if (applyColdStressAdjust) score += HUMIDITY_HIGH_WARMTH_ADJUST;
  } else if (weather.humidity < HUMIDITY_LOW_THRESHOLD) {
    score += HUMIDITY_LOW_WARMTH_ADJUST;
  }

  if (applyColdStressAdjust && weather.windSpeed > WIND_SPEED_WARMTH_THRESHOLD) {
    score += Math.min(
      MAX_WIND_WARMTH_ADJUST,
      Math.round(weather.windSpeed * WIND_WARMTH_MULTIPLIER)
    );
  }

  if (
    applyColdStressAdjust &&
    weather.precipProbability &&
    weather.precipProbability > PRECIP_PROBABILITY_THRESHOLD
  ) {
    score += PRECIP_WARMTH_ADJUST;
  }

  const months = babyAgeInMonths(baby.birthDate);
  if (applyColdStressAdjust) {
    if (months < YOUNG_BABY_AGE_MONTHS) score += YOUNG_BABY_WARMTH_ADJUST;
    else if (months < INFANT_AGE_MONTHS) score += INFANT_WARMTH_ADJUST;
  }

  const activityAdjust: Record<ActivityLevel, number> = {
    low: 3,
    medium: 0,
    high: -5,
  };
  score += activityAdjust[baby.activityLevel];

  if (scenario === "indoor") score -= 10;
  else if (scenario === "sleep") score -= 5;
  else if (scenario === "outdoor") score += 5;

  const slotAdjust: Record<TimeSlot, number> = {
    morning: 2,
    afternoon: 0,
    evening: 3,
    night: 5,
  };
  score += slotAdjust[timeSlot];

  if (variant === "warmer") score += VARIANT_WARMER_ADJUST;
  if (variant === "cooler") score += VARIANT_COOLER_ADJUST;

  score += baby.warmthOffset ?? 0;

  return Math.min(MAX_WARMTH_SCORE, Math.max(MIN_WARMTH_SCORE, Math.round(score)));
}
