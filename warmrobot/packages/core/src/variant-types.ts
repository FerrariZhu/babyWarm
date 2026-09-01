/**
 * Garment variant row shape shared by advice engine + slot swap (no category-advice import).
 */
export type VariantSlimRow = {
  category_code: string;
  warmth_value: number;
  consumer_label: string;
  consumer_label_en?: string | null;
  sort_order: number;
  is_active: boolean;
  /** From categories.outfit_slot — drives dynamic slot pools when present. */
  outfit_slot?: string | null;
  /** Material code (cotton/fleece/wool/…) — used to keep winter fabrics out of summer picks. */
  material?: string | null;
  thickness?: string | null;
  fit_type?: string | null;
  /** Hat type when category is `hat` (sun/everyday/warm). */
  hat_kind?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
  fill_type?: string | null;
  /** Variant copy for checklist cards (from garment_variants). */
  pros?: string | null;
  cons?: string | null;
};

/** Drop same-category slot-swap candidates farther than this from the anchor warmth. */
export const SWAP_WARMTH_DELTA_MAX = 18;
/** Wider window for cross-category swaps in the same slot (e.g. shorts ↔ long pants). */
export const SWAP_CROSS_CATEGORY_DELTA_MAX = 30;

export function swapWarmthDeltaMax(
  anchorCategory: string,
  candidateCategory: string
): number {
  return anchorCategory === candidateCategory
    ? SWAP_WARMTH_DELTA_MAX
    : SWAP_CROSS_CATEGORY_DELTA_MAX;
}
