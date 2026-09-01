/** Feels-like °C breakpoints → base warmth score (0–100). */
export const FEELS_LIKE_WARMTH_BANDS: ReadonlyArray<{ minFeelsLike: number; warmth: number }> = [
  { minFeelsLike: 28, warmth: 10 },
  { minFeelsLike: 22, warmth: 20 },
  { minFeelsLike: 18, warmth: 35 },
  { minFeelsLike: 12, warmth: 50 },
  { minFeelsLike: 5, warmth: 65 },
  { minFeelsLike: 0, warmth: 75 },
  { minFeelsLike: -5, warmth: 85 },
];

export const DEFAULT_COLD_FEELS_LIKE_WARMTH = 95;

export const HUMIDITY_HIGH_THRESHOLD = 80;
export const HUMIDITY_HIGH_WARMTH_ADJUST = 5;
export const HUMIDITY_LOW_THRESHOLD = 30;
export const HUMIDITY_LOW_WARMTH_ADJUST = -3;

export const WIND_SPEED_WARMTH_THRESHOLD = 5;
export const WIND_WARMTH_MULTIPLIER = 1.5;
export const MAX_WIND_WARMTH_ADJUST = 10;

export const PRECIP_PROBABILITY_THRESHOLD = 50;
export const PRECIP_WARMTH_ADJUST = 3;

/**
 * UV index at or above → outdoor sun protection gear (hat / outer_uv) on warm days
 * and tip-tag「注意防晒」. WHO「高」档起点。
 */
export const UV_OUTDOOR_THRESHOLD = 6;

/** UV index at or above → conclusion copy mentions 防晒（中等强度起）. */
export const UV_MODERATE_THRESHOLD = 3;

/** Months at or above → stop recommending diaper tip / say 可以不穿. */
export const DIAPER_OPTIONAL_AGE_MONTHS = 36;

export const YOUNG_BABY_AGE_MONTHS = 3;
export const YOUNG_BABY_WARMTH_ADJUST = 8;
export const INFANT_AGE_MONTHS = 6;
export const INFANT_WARMTH_ADJUST = 4;

export const VARIANT_WARMER_ADJUST = 10;
export const VARIANT_COOLER_ADJUST = -10;

export const MIN_WARMTH_SCORE = 0;
export const MAX_WARMTH_SCORE = 100;

/** Split required warmth across onion layers (inner, mid, outer). */
export const LAYER_WARMTH_RATIOS = [0.35, 0.35, 0.3] as const;
export const ONION_LAYER_COUNT = 3;

export const HAT_FEELS_LIKE_THRESHOLD_C = 15;
export const HAT_TARGET_WARMTH = 40;

/**
 * Apparent temperature at or above this is already warm/hot.
 * Humidity, wind, rain, and young-baby extras then must not add more
 * clothing warmth (feelsLike already includes weather stress; stacking
 * caused summer long-sleeves / fleece hats).
 */
export const COLD_STRESS_FEELS_LIKE_C = 22;

/** Fleece/wool/down hats only when requiredWarmth reaches the cold band. */
export const WINTER_HAT_WARMTH_THRESHOLD = 70;

export const SOCKS_FEELS_LIKE_THRESHOLD_C = 10;
export const SOCKS_TARGET_WARMTH = 25;

export const GLOVES_FEELS_LIKE_THRESHOLD_C = 5;
export const GLOVES_TARGET_WARMTH = 30;

export const OUTER_LAYER_WIND_SPEED_THRESHOLD = 6;
export const OUTFIT_WARMTH_COMBINATION_FACTOR = 0.55;
