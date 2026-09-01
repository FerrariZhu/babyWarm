/**
 * Weather-module tip tags (chips under 穿衣指数).
 * Product: docs/specs/home-daily-brief.md — tip tags live in 天气模块 only.
 *
 * Exhaustive enum: every code must be handled in evaluateTipTag / tipTagMeta.
 */
import { rainFromWeather } from "./advice-copy";
import type { WeatherSnapshot } from "./types";
import {
  PRECIP_PROBABILITY_THRESHOLD,
  UV_OUTDOOR_THRESHOLD,
  WIND_SPEED_WARMTH_THRESHOLD,
} from "./warmth-thresholds";

/**
 * Tip-tag wind threshold (m/s). Same as product「风较大」/ warmth wind start.
 * ≈18 km/h — early enough for baby wind-chill without waiting for meteorological 大风 (~10.8 m/s).
 */
export const WIND_TIP_THRESHOLD_MS = WIND_SPEED_WARMTH_THRESHOLD;

/** Stable tip-tag codes — keep in sync with public.advice_tip_tags seed. */
export const ADVICE_TIP_TAG_CODES = [
  "uv_caution",
  "bring_umbrella",
  "wind_caution",
] as const;

export type AdviceTipTagCode = (typeof ADVICE_TIP_TAG_CODES)[number];

export type AdviceTipTagTone = "uv" | "rain" | "wind";

/** Weather metric used for threshold evaluation (mirrors DB column). */
export type TipTagWeatherMetric = "uv_index" | "rain" | "wind_speed";

export interface AdviceTipTagDef {
  code: AdviceTipTagCode;
  label: string;
  tone: AdviceTipTagTone;
  /** Which weather field drives visibility. */
  weatherMetric: TipTagWeatherMetric;
  /**
   * Threshold for the metric.
   * - uv_index: show when uvIndex >= value
   * - rain: show when condition has「雨」OR precipProbability >= value
   * - wind_speed: show when windSpeed >= value (m/s)
   */
  threshold: number;
  sortOrder: number;
}

export interface AdviceTipTag {
  code: AdviceTipTagCode;
  label: string;
  tone: AdviceTipTagTone;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled advice tip tag: ${String(value)}`);
}

/** Canonical defs — single source for code path; DB seed must match. */
export const ADVICE_TIP_TAG_DEFS: Record<AdviceTipTagCode, AdviceTipTagDef> = {
  uv_caution: {
    code: "uv_caution",
    label: "注意防晒",
    tone: "uv",
    weatherMetric: "uv_index",
    threshold: UV_OUTDOOR_THRESHOLD,
    sortOrder: 10,
  },
  bring_umbrella: {
    code: "bring_umbrella",
    label: "记得带伞",
    tone: "rain",
    weatherMetric: "rain",
    threshold: PRECIP_PROBABILITY_THRESHOLD,
    sortOrder: 20,
  },
  wind_caution: {
    code: "wind_caution",
    label: "注意大风",
    tone: "wind",
    weatherMetric: "wind_speed",
    threshold: WIND_TIP_THRESHOLD_MS,
    sortOrder: 30,
  },
};

export function tipTagMeta(code: AdviceTipTagCode): AdviceTipTagDef {
  switch (code) {
    case "uv_caution":
    case "bring_umbrella":
    case "wind_caution":
      return ADVICE_TIP_TAG_DEFS[code];
    default:
      return assertNever(code);
  }
}

/** Whether this tip tag should show for the given weather. Exhaustive on code. */
export function evaluateTipTag(
  code: AdviceTipTagCode,
  weather: WeatherSnapshot
): boolean {
  const def = tipTagMeta(code);
  switch (def.weatherMetric) {
    case "uv_index": {
      const threshold = def.threshold ?? UV_OUTDOOR_THRESHOLD;
      return (weather.uvIndex ?? 0) >= threshold;
    }
    case "rain": {
      // condition「雨」OR precip >= threshold (same rule as umbrella extras)
      return rainFromWeather(weather) !== "none";
    }
    case "wind_speed": {
      const threshold = def.threshold ?? WIND_TIP_THRESHOLD_MS;
      return weather.windSpeed >= threshold;
    }
    default:
      return assertNever(def.weatherMetric);
  }
}

/** Active tip tags for this weather, sorted. */
export function resolveAdviceTipTags(weather: WeatherSnapshot): AdviceTipTag[] {
  return ADVICE_TIP_TAG_CODES.filter((code) => evaluateTipTag(code, weather))
    .map((code) => {
      const def = tipTagMeta(code);
      return { code: def.code, label: def.label, tone: def.tone };
    })
    .sort(
      (a, b) =>
        tipTagMeta(a.code).sortOrder - tipTagMeta(b.code).sortOrder
    );
}
