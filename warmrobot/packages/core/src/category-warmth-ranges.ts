/**
 * Category warmth intervals aligned with requiredWarmth (穿衣指数, 0–100).
 *
 * Each fine category spans a closed interval [warmthMin, warmthMax] to account
 * for thickness (薄/中/厚), fit, and style variation within the same code.
 *
 * Selection rule (future DB-driven engine): warmthMin <= requiredWarmth <= warmthMax
 *
 * Source of truth for seed: supabase/migrations/20240101000024_category_warmth_ranges.sql
 * Product spec: docs/specs/category-admin.md §4
 */
import type { ClothingCategory } from "./types";

export type CategoryWarmthRange = {
  /** Inclusive lower bound on 穿衣指数 */
  warmthMin: number;
  /** Inclusive upper bound on 穿衣指数 */
  warmthMax: number;
};

/** Band edges shared with WARMTH_CATEGORY_BANDS / heatFromRequiredWarmth. */
export const WARMTH_BAND_EDGES = [25, 40, 55, 70, 85] as const;

/**
 * Thickness/style buffer (±points) applied at band boundaries when defining intervals.
 * Matches enums §4 薄/中/厚 variation within a category.
 */
export const WARMTH_RANGE_EDGE_BUFFER = 8;

export const CATEGORY_WARMTH_RANGES: Record<ClothingCategory, CategoryWarmthRange> = {
  // —— base_top ——
  /** hot + warm bands; 厚款可顶到微凉 */
  bodysuit_short: { warmthMin: 0, warmthMax: 42 },
  /** mild band; 薄/厚长袖包屁衣 */
  bodysuit_long: { warmthMin: 32, warmthMax: 58 },
  tshirt_short: { warmthMin: 0, warmthMax: 42 },
  /** ≥12 月替代包屁衣; 略宽以覆盖过渡季 */
  tshirt_long: { warmthMin: 32, warmthMax: 62 },
  /** cool–freezing; 薄秋衣可略早启用 */
  thermal_top: { warmthMin: 48, warmthMax: 100 },

  // —— mid_top ——
  sweater: { warmthMin: 48, warmthMax: 100 },
  fleece_top: { warmthMin: 62, warmthMax: 92 },
  /** 可选叠穿; 不在当前 bands 种子中 */
  vest: { warmthMin: 40, warmthMax: 78 },
  vest_down: { warmthMin: 62, warmthMax: 92 },

  // —— outer ——
  outer_uv: { warmthMin: 0, warmthMax: 45 },
  outer_shell: { warmthMin: 32, warmthMax: 72 },
  outer_cotton: { warmthMin: 62, warmthMax: 92 },
  outer_down: { warmthMin: 78, warmthMax: 100 },

  // —— base_bottom ——
  long_johns: { warmthMin: 48, warmthMax: 100 },

  // —— bottom ——
  pants_short: { warmthMin: 18, warmthMax: 45 },
  pants_mid: { warmthMin: 28, warmthMax: 58 },
  /** mild 主用; 厚长裤可延续到凉档 */
  pants_long: { warmthMin: 35, warmthMax: 85 },

  // —— socks / shoes ——
  socks: { warmthMin: 0, warmthMax: 100 },
  shoes_sandal: { warmthMin: 0, warmthMax: 28 },
  shoes_sneaker: { warmthMin: 22, warmthMax: 72 },
  shoes_leather: { warmthMin: 32, warmthMax: 68 },
  shoes_boot: { warmthMin: 62, warmthMax: 100 },

  // —— accessory ——
  /** 遮阳帽 (热) + 保暖帽 (冷); 全区间 */
  hat: { warmthMin: 0, warmthMax: 100 },
  scarf: { warmthMin: 78, warmthMax: 100 },
  gloves: { warmthMin: 62, warmthMax: 100 },
  other: { warmthMin: 0, warmthMax: 100 },
};

export function isWarmthInCategoryRange(
  requiredWarmth: number,
  category: ClothingCategory
): boolean {
  const { warmthMin, warmthMax } = CATEGORY_WARMTH_RANGES[category];
  return requiredWarmth >= warmthMin && requiredWarmth <= warmthMax;
}

export const CATEGORY_WARMTH_RANGE_ENTRIES = Object.entries(
  CATEGORY_WARMTH_RANGES
) as Array<[ClothingCategory, CategoryWarmthRange]>;
