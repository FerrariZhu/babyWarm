/** Allocate one weather-driven clothing index across a complete wearable outfit. */
import type { AdviceItem } from "./daily-brief-types";
import { MAX_WARMTH_SCORE, MIN_WARMTH_SCORE } from "./warmth-thresholds";

/** Relative body-coverage share for every slot present in the outfit. */
export const SLOT_WARMTH_WEIGHTS: Readonly<Record<string, number>> = {
  base_top: 0.32,
  mid_top: 0.2,
  outer: 0.24,
  base_bottom: 0.14,
  bottom: 0.22,
  socks: 0.1,
  shoes: 0.08,
  hat: 0.1,
  scarf: 0.1,
  gloves: 0.1,
  other: 0.08,
};

const DEFAULT_SLOT_WEIGHT = 0.1;

function clampWarmth(value: number): number {
  return Math.min(MAX_WARMTH_SCORE, Math.max(MIN_WARMTH_SCORE, Math.round(value)));
}

export function resolveOutfitSlot(item: AdviceItem): string | null {
  if (item.outfitSlot) return item.outfitSlot;
  return null;
}

/** Allocate the weather target across all wearable garment cards.
 * Raw variant value × coverage weight determines the share. Largest remainders
 * ensure integer badges sum exactly to R. Non-wearable reminders never enter.
 */
export function applyOutfitIndex(items: AdviceItem[], requiredWarmth: number): void {
  const garments = items.filter((item) => item.kind === "category");
  if (!garments.length) return;
  const target = Number.isFinite(requiredWarmth) ? clampWarmth(requiredWarmth) : 0;
  const rows = garments.map((item, index) => {
    const raw = item.baseWarmthValue ?? item.warmthValue;
    item.baseWarmthValue = raw != null && Number.isFinite(raw) ? Math.max(0, raw) : 1;
    const weight = (SLOT_WARMTH_WEIGHTS[resolveOutfitSlot(item) ?? "other"] ?? DEFAULT_SLOT_WEIGHT)
      * Math.max(1, item.baseWarmthValue);
    return { item, index, weight, value: 0, remainder: 0 };
  });
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  for (const row of rows) {
    const exact = target * row.weight / total;
    row.value = Math.floor(exact);
    row.remainder = exact - row.value;
  }
  const remaining = target - rows.reduce((sum, row) => sum + row.value, 0);
  rows.sort((a,b) => b.remainder-a.remainder || a.index-b.index);
  for (let i=0; i<remaining; i++) rows[i].value++;
  for (const row of rows) row.item.warmthValue = row.value;
}
