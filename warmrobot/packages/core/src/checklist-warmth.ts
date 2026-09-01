/**
 * Checklist warmth: slot allocation + zone sum 穿衣指数.
 *
 * - **室内**分区指数略低于今日 R；**室外**（出门再加）略高于 R。
 * - Each card shows a slot share; indices in a zone **sum** to that zone's target.
 * - Garment picking uses variant `warmth_value` against zone-adjusted pick targets.
 */
import type { AdviceItem } from "./daily-brief-types";
import { MAX_WARMTH_SCORE, MIN_WARMTH_SCORE } from "./warmth-thresholds";

/** Fixed diaper insulation (moderate trunk layer). */
export const DIAPER_WARMTH_VALUE = 12;

/** Pseudo-slot for tip id `diaper`. */
export const DIAPER_OUTFIT_SLOT = "diaper" as const;

/** Indoor checklist zone target ≈ R × this (base layers at home). */
export const INDOOR_ZONE_WARMTH_FACTOR = 0.9;
/** Outdoor additions zone target ≈ R × this (extra layers when going out). */
export const OUTDOOR_ZONE_WARMTH_FACTOR = 1.1;

export type ChecklistWarmthZone = "indoor" | "outdoor";

/**
 * Relative share when splitting a **zone** target across its present slots.
 * Renormalized per zone — only slots that appear indoors/outdoors contribute.
 */
export const SLOT_WARMTH_WEIGHTS: Readonly<Record<string, number>> = {
  diaper: 0.14,
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

/**
 * @deprecated Slot picks now use allocated slot indices from {@link allocateSlotWarmthIndices}.
 */
export const SLOT_TARGET_ALPHAS: Readonly<Record<string, number>> = {
  diaper: 1,
  base_top: 0.9,
  mid_top: 1,
  outer: 1.15,
  base_bottom: 0.95,
  bottom: 1,
  socks: 0.85,
  shoes: 1,
  hat: 1.05,
  scarf: 1.1,
  gloves: 1.05,
};

const DEFAULT_SLOT_WEIGHT = 0.1;
const DEFAULT_SLOT_ALPHA = 1;

function clampWarmth(value: number): number {
  return Math.min(MAX_WARMTH_SCORE, Math.max(MIN_WARMTH_SCORE, Math.round(value)));
}

/** Zone headline target shown beside 家里穿 / 出门再加 (indoor lower, outdoor higher than R). */
export function zoneTargetWarmth(
  requiredWarmth: number,
  zone: ChecklistWarmthZone
): number {
  const factor =
    zone === "indoor" ? INDOOR_ZONE_WARMTH_FACTOR : OUTDOOR_ZONE_WARMTH_FACTOR;
  return clampWarmth(requiredWarmth * factor);
}

/** Variant pick target for a slot within a zone (uses zone-adjusted R × slot α). */
export function slotTargetWarmth(
  requiredWarmth: number,
  slot: string,
  zone: ChecklistWarmthZone = "indoor"
): number {
  if (slot === DIAPER_OUTFIT_SLOT) return DIAPER_WARMTH_VALUE;
  const zoneR = zoneTargetWarmth(requiredWarmth, zone);
  const alpha = SLOT_TARGET_ALPHAS[slot] ?? DEFAULT_SLOT_ALPHA;
  return clampWarmth(zoneR * alpha);
}

export function resolveOutfitSlot(item: AdviceItem): string | null {
  if (item.outfitSlot) return item.outfitSlot;
  if (item.kind === "tip" && item.id === "diaper") return DIAPER_OUTFIT_SLOT;
  return null;
}

function itemWarmth(item: AdviceItem): number | null {
  if (item.kind === "tip" && item.id === "diaper") {
    return item.warmthValue ?? DIAPER_WARMTH_VALUE;
  }
  if (item.kind !== "category") return null;
  if (item.warmthValue == null || !Number.isFinite(item.warmthValue)) return null;
  return Math.round(item.warmthValue);
}

/**
 * Split `targetR` across present slots (largest-remainder). Sum of returned values === targetR
 * (after clamp correction on the largest weighted slot when clamping occurs).
 */
export function allocateSlotWarmthIndices(
  slots: readonly string[],
  targetR: number,
  fixedValues: Readonly<Record<string, number>> = {}
): Record<string, number> {
  const uniqueSlots = [...new Set(slots.filter(Boolean))];
  const result: Record<string, number> = {};
  if (uniqueSlots.length === 0) return result;

  const target = clampWarmth(targetR);
  let remaining = target;

  for (const slot of uniqueSlots) {
    const fixed = fixedValues[slot];
    if (fixed == null) continue;
    const value = clampWarmth(fixed);
    result[slot] = value;
    remaining -= value;
  }

  const weightedSlots = uniqueSlots.filter((slot) => result[slot] == null);
  if (weightedSlots.length === 0) return result;

  if (remaining < 0) remaining = 0;

  const shares = weightedSlots.map((slot) => {
    const weight = SLOT_WARMTH_WEIGHTS[slot] ?? DEFAULT_SLOT_WEIGHT;
    const exact = (remaining * weight) /
      weightedSlots.reduce(
        (sum, s) => sum + (SLOT_WARMTH_WEIGHTS[s] ?? DEFAULT_SLOT_WEIGHT),
        0
      );
    const floor = Math.floor(exact);
    return { slot, floor, frac: exact - floor };
  });

  let assigned = shares.reduce((sum, row) => sum + row.floor, 0);
  let deficit = remaining - assigned;
  shares.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < shares.length && deficit > 0; i += 1, deficit -= 1) {
    shares[i]!.floor += 1;
  }

  for (const { slot, floor } of shares) {
    result[slot] = clampWarmth(floor);
  }

  const sum = uniqueSlots.reduce((total, slot) => total + (result[slot] ?? 0), 0);
  const drift = target - sum;
  if (drift !== 0) {
    const adjustSlot =
      weightedSlots.find((slot) => (result[slot] ?? 0) + drift >= MIN_WARMTH_SCORE &&
        (result[slot] ?? 0) + drift <= MAX_WARMTH_SCORE) ?? weightedSlots[0];
    if (adjustSlot) {
      result[adjustSlot] = clampWarmth((result[adjustSlot] ?? 0) + drift);
    }
  }

  return result;
}

/** Write allocated slot indices onto checklist items (card badge + zone sum). */
export function applyChecklistWarmthAllocations(
  items: AdviceItem[],
  zoneTargetR: number,
  options?: {
    fixedValues?: Readonly<Record<string, number>>;
    /** Skip fixed diaper when zone target is too tight (keeps sum exact). */
    allowDiaperFixed?: boolean;
  }
): void {
  const slots = items
    .map((item) => resolveOutfitSlot(item))
    .filter((slot): slot is string => Boolean(slot));

  const fixedValues: Record<string, number> = { ...(options?.fixedValues ?? {}) };
  const allowDiaperFixed = options?.allowDiaperFixed ?? true;
  if (
    allowDiaperFixed &&
    slots.includes(DIAPER_OUTFIT_SLOT) &&
    zoneTargetR >= DIAPER_WARMTH_VALUE + 3 &&
    fixedValues[DIAPER_OUTFIT_SLOT] == null
  ) {
    fixedValues[DIAPER_OUTFIT_SLOT] = DIAPER_WARMTH_VALUE;
  }

  const allocations = allocateSlotWarmthIndices(slots, zoneTargetR, fixedValues);

  for (const item of items) {
    const slot = resolveOutfitSlot(item);
    if (!slot || allocations[slot] == null) continue;
    item.warmthValue = allocations[slot];
  }
}

/**
 * Zone 穿衣指数: sum of slot indices on cards (equals `targetR` after allocation).
 */
export function effectiveChecklistWarmth(items: AdviceItem[]): number | null {
  let sum = 0;
  let counted = 0;

  for (const item of items) {
    const warmth = itemWarmth(item);
    if (warmth == null) continue;
    sum += warmth;
    counted += 1;
  }

  if (counted === 0) return null;
  return sum;
}

/** @deprecated Alias of {@link effectiveChecklistWarmth}. */
export function sumChecklistWarmth(items: AdviceItem[]): number | null {
  return effectiveChecklistWarmth(items);
}
