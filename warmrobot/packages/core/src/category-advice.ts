import { applyOutfitIndex } from "./checklist-warmth";
import {
  ADVICE_COPY,
  DIAPER_OPTIONAL_AGE_MONTHS,
  formatAdviceConclusion,
  rainFromWeather,
  umbrellaReasonFromRain,
} from "./advice-copy";
import { babyAgeInMonths } from "./baby-age";
import {
  BRIEF_ADVICE_SCHEMA_VERSION,
  CATEGORY_DISPLAY_LABELS,
  CATEGORY_DISPLAY_LABELS_EN,
  type AdviceExtra,
  type AdviceItem,
  type BriefAdvice,
  type DressingAdvice,
} from "./daily-brief-types";
import { isWarmthInCategoryRange } from "./category-warmth-ranges";
import { calcRequiredWarmth } from "./required-warmth";
import type { BabyProfile, ClothingCategory, WeatherSnapshot } from "./types";
import {
  buildAlternativeGroups,
  pickClosestWarmth,
  rankSlotAlternatives,
  type SlotSwapBaby,
} from "./slot-swap";
import { SWAP_WARMTH_DELTA_MAX, swapWarmthDeltaMax, type VariantSlimRow } from "./variant-types";
import {
  PRECIP_PROBABILITY_THRESHOLD,
  UV_MODERATE_THRESHOLD,
  UV_OUTDOOR_THRESHOLD,
  WINTER_HAT_WARMTH_THRESHOLD,
} from "./warmth-thresholds";
import { resolveAdviceTipTags } from "./advice-tip-tags";
import { compactVariantCopy } from "./variant-copy-compact";
import {
  DIAPER_OUTFIT_SLOT,
  DIAPER_WARMTH_VALUE,
  type ChecklistWarmthZone,
} from "./checklist-warmth";
import {
  HAT_KIND_LABELS,
  hatKindFromAttrs,
  type HatKind,
} from "./garment-variant-generator";
import { buildVariantSubtitleFromRow } from "./variant-subtitle";
import { shouldRecommendDiaper } from "./diaper-status";

export type { VariantSlimRow } from "./variant-types";

/** Default precip % threshold for umbrella tip (product default 50). */
export const UMBRELLA_PRECIP_THRESHOLD = PRECIP_PROBABILITY_THRESHOLD;

type CategoryBand = {
  maxWarmth: number;
  indoor: ClothingCategory[];
  outdoor: ClothingCategory[];
};

const BODYSUT_PREF_MONTHS = 12;

/**
 * Slot → candidate categories. When variants are loaded, each band-prescribed
 * category maps to a slot; we pick the closest warmth_value across the whole pool.
 */
const SLOT_POOLS = {
  base_top: [
    "bodysuit_short",
    "bodysuit_long",
    "tshirt_short",
    "tshirt_long",
    "thermal_top",
  ] as const satisfies readonly ClothingCategory[],
  mid_top: ["sweater", "fleece_top", "vest", "vest_down"] as const satisfies readonly ClothingCategory[],
  outer: [
    "outer_uv",
    "outer_shell",
    "outer_cotton",
    "outer_down",
  ] as const satisfies readonly ClothingCategory[],
  base_bottom: ["long_johns"] as const satisfies readonly ClothingCategory[],
  bottom: ["pants_short", "pants_mid", "pants_long"] as const satisfies readonly ClothingCategory[],
  socks: ["socks"] as const satisfies readonly ClothingCategory[],
  shoes: [
    "shoes_sandal",
    "shoes_sneaker",
    "shoes_leather",
    "shoes_boot",
  ] as const satisfies readonly ClothingCategory[],
  hat: ["hat"] as const satisfies readonly ClothingCategory[],
  scarf: ["scarf"] as const satisfies readonly ClothingCategory[],
  gloves: ["gloves"] as const satisfies readonly ClothingCategory[],
};

type OutfitSlot = keyof typeof SLOT_POOLS;

const CATEGORY_TO_SLOT: Partial<Record<ClothingCategory, OutfitSlot>> = {
  bodysuit_short: "base_top",
  bodysuit_long: "base_top",
  tshirt_short: "base_top",
  tshirt_long: "base_top",
  thermal_top: "base_top",
  sweater: "mid_top",
  fleece_top: "mid_top",
  vest: "mid_top",
  vest_down: "mid_top",
  outer_uv: "outer",
  outer_shell: "outer",
  outer_cotton: "outer",
  outer_down: "outer",
  long_johns: "base_bottom",
  pants_short: "bottom",
  pants_mid: "bottom",
  pants_long: "bottom",
  socks: "socks",
  shoes_sandal: "shoes",
  shoes_sneaker: "shoes",
  shoes_leather: "shoes",
  shoes_boot: "shoes",
  hat: "hat",
  scarf: "scarf",
  gloves: "gloves",
};

const WARMTH_CATEGORY_BANDS: CategoryBand[] = [
  {
    maxWarmth: 25,
    indoor: ["bodysuit_short", "socks"],
    outdoor: ["hat", "outer_uv", "shoes_sandal"],
  },
  {
    maxWarmth: 40,
    indoor: ["bodysuit_short", "pants_short", "socks"],
    outdoor: ["hat", "outer_uv", "shoes_sneaker"],
  },
  {
    maxWarmth: 55,
    indoor: ["bodysuit_long", "pants_long", "socks"],
    outdoor: ["outer_shell", "hat", "shoes_sneaker"],
  },
  {
    maxWarmth: 70,
    indoor: ["thermal_top", "long_johns", "socks"],
    outdoor: ["sweater", "outer_shell", "hat", "shoes_sneaker"],
  },
  {
    maxWarmth: 85,
    indoor: ["thermal_top", "long_johns", "socks"],
    outdoor: ["fleece_top", "outer_cotton", "hat", "gloves", "shoes_boot"],
  },
  {
    maxWarmth: 101,
    indoor: ["thermal_top", "long_johns", "socks"],
    outdoor: ["sweater", "outer_down", "hat", "scarf", "gloves", "shoes_boot"],
  },
];

/**
 * Split C-end `consumer_label` (`T恤 · 厚棉保暖 宽松`) into card title + subtitle.
 * Subtitle joins feature tokens with `·` → `厚棉保暖·宽松`.
 */
export function splitConsumerLabel(consumerLabel: string): {
  title: string;
  subtitle?: string;
} {
  const sep = " · ";
  const idx = consumerLabel.indexOf(sep);
  if (idx < 0) {
    const title = consumerLabel.trim();
    return title ? { title } : { title: consumerLabel };
  }
  const title = consumerLabel.slice(0, idx).trim();
  const rest = consumerLabel.slice(idx + sep.length).trim();
  if (!rest) return { title: title || consumerLabel };
  const subtitle = rest.split(/\s+/).filter(Boolean).join("·");
  return { title: title || consumerLabel, subtitle };
}

/**
 * Inverse of splitConsumerLabel — persist as `T恤 · 厚棉保暖 宽松`.
 * Accepts subtitle with either spaces or `·` separators.
 */
export function joinConsumerLabel(title: string, subtitle?: string | null): string {
  const t = title.trim();
  if (!t) return "";
  const rest = (subtitle ?? "")
    .trim()
    .replace(/·/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return rest ? `${t} · ${rest}` : t;
}

function categoryItem(
  code: string,
  labelOverride?: string,
  labelEnOverride?: string,
  subtitle?: string,
  warmthValue?: number
): AdviceItem {
  const known = code as ClothingCategory;
  return {
    kind: "category",
    id: `cat:${code}`,
    label: labelOverride ?? CATEGORY_DISPLAY_LABELS[known] ?? code,
    labelEn: labelEnOverride ?? CATEGORY_DISPLAY_LABELS_EN[known],
    ...(subtitle ? { subtitle } : {}),
    category: known,
    ...(warmthValue != null ? { warmthValue: Math.round(warmthValue) } : {}),
  };
}

function tipItem(id: string, label: string, labelEn: string): AdviceItem {
  if (id === "diaper") {
    return {
      kind: "tip",
      id,
      label,
      labelEn,
      warmthValue: DIAPER_WARMTH_VALUE,
      outfitSlot: DIAPER_OUTFIT_SLOT,
    };
  }
  return { kind: "tip", id, label, labelEn };
}

function uniqueCategories(codes: ClothingCategory[]): ClothingCategory[] {
  return [...new Set(codes)];
}

function pickBand(requiredWarmth: number): CategoryBand {
  for (const band of WARMTH_CATEGORY_BANDS) {
    if (requiredWarmth < band.maxWarmth) return band;
  }
  return WARMTH_CATEGORY_BANDS[WARMTH_CATEGORY_BANDS.length - 1]!;
}

function preferBodysuitIndoor(
  indoor: ClothingCategory[],
  ageMonths: number
): ClothingCategory[] {
  if (ageMonths >= BODYSUT_PREF_MONTHS) {
    const expanded = indoor.flatMap((c): ClothingCategory[] => {
      if (c === "bodysuit_short") return ["tshirt_short", "pants_short"];
      if (c === "bodysuit_long") return ["tshirt_long", "pants_long"];
      return [c];
    });
    return uniqueCategories(expanded);
  }
  const hasBodysuit = indoor.some((c) => c.startsWith("bodysuit_"));
  if (hasBodysuit) {
    return uniqueCategories(indoor.filter((c) => !c.startsWith("pants_")));
  }
  return uniqueCategories(indoor);
}

function sockLabels(requiredWarmth: number): { zh: string; en: string } {
  if (requiredWarmth < 30) return { zh: "薄袜子", en: "Lightweight Socks" };
  if (requiredWarmth < 60) return { zh: "袜子", en: "Socks" };
  return { zh: "厚袜子", en: "Thick Socks" };
}

function hatKindFromVariant(v: VariantSlimRow): HatKind {
  if (v.hat_kind === "sun" || v.hat_kind === "everyday" || v.hat_kind === "warm") {
    return v.hat_kind;
  }
  const title = splitConsumerLabel(v.consumer_label).title;
  if (title === HAT_KIND_LABELS.sun.zh) return "sun";
  if (title === HAT_KIND_LABELS.warm.zh) return "warm";
  return hatKindFromAttrs(v.material, v.thickness, v.hat_kind);
}

function isSunHatVariant(v: VariantSlimRow): boolean {
  return v.category_code === "hat" && hatKindFromVariant(v) === "sun";
}

function labelEnForVariant(picked: VariantSlimRow): string | undefined {
  const stored = picked.consumer_label_en?.trim();
  if (picked.category_code === "hat") {
    return stored || HAT_KIND_LABELS[hatKindFromVariant(picked)].en;
  }
  if (stored) return stored;
  if (isClothingCategory(picked.category_code)) {
    return CATEGORY_DISPLAY_LABELS_EN[picked.category_code];
  }
  return undefined;
}

function hatLabels(uvIndex: number, requiredWarmth: number): { zh: string; en: string } {
  if (uvIndex >= UV_MODERATE_THRESHOLD && requiredWarmth < 45) {
    return { zh: "遮阳帽", en: "Sun Hat" };
  }
  if (requiredWarmth >= WINTER_HAT_WARMTH_THRESHOLD) return { zh: "保暖帽", en: "Warm Hat" };
  return { zh: CATEGORY_DISPLAY_LABELS.hat, en: CATEGORY_DISPLAY_LABELS_EN.hat };
}

/** Warm-day sun gear from moderate UV; high UV always eligible for hat tip. */
function shouldAddSunProtection(uvIndex: number, requiredWarmth: number): boolean {
  if (uvIndex >= UV_MODERATE_THRESHOLD && requiredWarmth < 45) return true;
  return uvIndex >= UV_OUTDOOR_THRESHOLD;
}

function isClothingCategory(code: string): code is ClothingCategory {
  return code in CATEGORY_DISPLAY_LABELS;
}

const WINTER_MATERIALS = new Set(["fleece", "wool", "down"]);
const WINTER_LABEL_RE = /抓绒|羊毛|羽绒/;
/** Hot + warm bands: no winter fabrics on any slot. */
const WINTER_FABRIC_WARMTH_THRESHOLD = 40;

function isWinterInsulatingVariant(v: VariantSlimRow): boolean {
  if (v.material && WINTER_MATERIALS.has(v.material)) return true;
  if (!v.material && WINTER_LABEL_RE.test(v.consumer_label)) return true;
  return false;
}

function allowsWinterFabric(categoryCode: string, requiredWarmth: number): boolean {
  if (categoryCode === "hat") return requiredWarmth >= WINTER_HAT_WARMTH_THRESHOLD;
  return requiredWarmth >= WINTER_FABRIC_WARMTH_THRESHOLD;
}

function collectSlotCandidates(
  variants: VariantSlimRow[],
  pool: readonly string[],
  requiredWarmth: number,
  options?: { preferSunHat?: boolean }
): VariantSlimRow[] {
  const allowed = new Set(pool);
  const inPool = variants.filter((v) => v.is_active && allowed.has(v.category_code));
  if (inPool.length === 0) return [];

  const inRange = inPool.filter((v) => {
    if (!isClothingCategory(v.category_code)) return true;
    return isWarmthInCategoryRange(requiredWarmth, v.category_code);
  });
  let candidates = inRange.length > 0 ? inRange : inPool;

  const seasonOk = candidates.filter(
    (v) => !isWinterInsulatingVariant(v) || allowsWinterFabric(v.category_code, requiredWarmth)
  );
  if (seasonOk.length > 0) candidates = seasonOk;

  if (options?.preferSunHat) {
    const sunHats = candidates.filter(isSunHatVariant);
    if (sunHats.length > 0) candidates = sunHats;
  }

  return candidates;
}

/**
 * Slot 自选候选：整池 + 季节过滤，按与当前件 warmth_value 接近程度收窄。
 * 跨品类（如短裤↔中裤）使用更宽的温差窗口。
 */
export function collectSlotSwapCandidates(
  variants: VariantSlimRow[],
  pool: readonly string[],
  anchor: Pick<VariantSlimRow, "warmth_value" | "category_code">,
  requiredWarmth: number,
  options?: { preferSunHat?: boolean }
): VariantSlimRow[] {
  const allowed = new Set(pool);
  let candidates = variants.filter((v) => v.is_active && allowed.has(v.category_code));
  if (candidates.length === 0) return [];

  const seasonOk = candidates.filter(
    (v) => !isWinterInsulatingVariant(v) || allowsWinterFabric(v.category_code, requiredWarmth)
  );
  if (seasonOk.length > 0) candidates = seasonOk;

  if (options?.preferSunHat) {
    const sunHats = candidates.filter(isSunHatVariant);
    if (sunHats.length > 0) candidates = sunHats;
  }

  const anchorWarmth = anchor.warmth_value;
  const nearAnchor = candidates.filter(
    (v) =>
      Math.abs(v.warmth_value - anchorWarmth) <=
      swapWarmthDeltaMax(anchor.category_code, v.category_code)
  );
  if (nearAnchor.length > 0) return nearAnchor;

  const poolCategoryCount = new Set(pool).size;
  if (poolCategoryCount >= 2) {
    const fallback: VariantSlimRow[] = [];
    for (const categoryCode of pool) {
      if (categoryCode === anchor.category_code) continue;
      const inCategory = candidates.filter((v) => v.category_code === categoryCode);
      if (inCategory.length === 0) continue;
      const closest = pickClosestWarmth(inCategory, anchorWarmth);
      if (closest) fallback.push(closest);
    }
    if (fallback.length > 0) return fallback;
  }

  return candidates.filter((v) => {
    if (v.category_code !== anchor.category_code) return false;
    return Math.abs(v.warmth_value - anchorWarmth) <= SWAP_WARMTH_DELTA_MAX;
  });
}

/** Strict candidates for independent category/attribute selectors. Never widen on empty. */
export function collectChecklistCandidates(
  variants: VariantSlimRow[], pool: readonly string[],
  anchor: VariantSlimRow, requiredWarmth: number
): VariantSlimRow[] {
  return variants.filter((v) => {
    if (!v.is_active || !pool.includes(v.category_code)) return false;
    if (!isClothingCategory(v.category_code) || !isWarmthInCategoryRange(requiredWarmth, v.category_code)) return false;
    if (isWinterInsulatingVariant(v) && !allowsWinterFabric(v.category_code, requiredWarmth)) return false;
    // Sun protection and hats retain their weather job; a warm hat cannot replace a sun hat.
    if (anchor.category_code === "outer_uv" || v.category_code === "outer_uv") {
      if (v.category_code !== anchor.category_code) return false;
    }
    if (anchor.category_code === "hat" && hatKindFromVariant(v) !== hatKindFromVariant(anchor)) return false;
    return Math.abs(v.warmth_value - anchor.warmth_value) <= swapWarmthDeltaMax(anchor.category_code, v.category_code);
  });
}

/**
 * Among active variants whose category is in `pool`, pick the one closest to
 * `targetWarmth`. Cotton is preferred when the type has it (tie-break: sort_order).
 *
 * Season / category-range filters use `rangeWarmth` (today's requiredWarmth).
 * All slots compare against the same demand index; item scores are not portions of a total.
 */
export function pickClosestVariant(
  variants: VariantSlimRow[],
  pool: readonly string[],
  targetWarmth: number,
  options?: { preferSunHat?: boolean; rangeWarmth?: number; preferSockHeight?: string | null }
): VariantSlimRow | null {
  const rangeWarmth = options?.rangeWarmth ?? targetWarmth;
  const candidates = collectSlotCandidates(variants, pool, rangeWarmth, options);
  if (candidates.length === 0) return null;
  return pickClosestWarmth(candidates, targetWarmth, {
    preferSockHeight: options?.preferSockHeight,
  });
}

function baseTopPoolCodes(
  ageMonths: number,
  variants: VariantSlimRow[]
): string[] {
  const pool = categoriesInSlot("base_top", variants);

  if (ageMonths < BODYSUT_PREF_MONTHS) {
    const young = pool.filter(
      (c) => c.startsWith("bodysuit_") || c.includes("romper")
    );
    return young.length > 0 ? young : pool;
  }
  const older = pool.filter(
    (c) =>
      c.startsWith("tshirt_") ||
      c === "thermal_top" ||
      (!c.startsWith("bodysuit_") && !c.includes("romper"))
  );
  return older.length > 0 ? older : pool;
}

function poolForSlot(
  slot: OutfitSlot,
  ageMonths: number,
  variants: VariantSlimRow[]
): readonly string[] {
  if (slot === "base_top") return baseTopPoolCodes(ageMonths, variants);
  return categoriesInSlot(slot, variants);
}

/** Swap list uses the full slot (all mapped categories), not the age-narrowed pick pool. */
function swapPoolForSlot(slot: OutfitSlot, variants: VariantSlimRow[]): readonly string[] {
  return categoriesInSlot(slot, variants);
}

function categoriesInSlot(slot: OutfitSlot, variants: VariantSlimRow[]): string[] {
  const fromDb = [
    ...new Set(
      variants
        .filter((v) => v.is_active && v.outfit_slot === slot)
        .map((v) => v.category_code)
    ),
  ];
  if (fromDb.length > 0) return fromDb;
  return [...SLOT_POOLS[slot]];
}

function variantToAdviceItem(
  picked: VariantSlimRow,
  slot: OutfitSlot
): AdviceItem {
  const displayTitle =
    picked.category_code === "hat"
      ? HAT_KIND_LABELS[hatKindFromVariant(picked)].zh
      : picked.consumer_label.trim();
  const subtitle = buildVariantSubtitleFromRow(picked);
  const item = categoryItem(
    picked.category_code,
    displayTitle,
    labelEnForVariant(picked),
    subtitle
  );
  item.outfitSlot = slot;
  item.material = picked.material ?? null;
  item.thickness = picked.thickness ?? null;
  item.fitType = picked.fit_type ?? null;
  item.bodysuitStyle = picked.bodysuit_style ?? null;
  item.sockHeight = picked.sock_height ?? null;
  item.pantLength = picked.pant_length ?? null;
  if (picked.category_code === "hat") {
    item.hatKind = hatKindFromVariant(picked);
  }
  item.warmthValue = picked.warmth_value;
  item.baseWarmthValue = picked.warmth_value;
  if (picked.pros) item.pros = compactVariantCopy(picked.pros);
  if (picked.cons) item.cons = compactVariantCopy(picked.cons);
  return item;
}

/**
 * Expand band category codes → unique slots → pick one variant per slot from
 * the full slot pool (closest warmth_value to that slot's target for R).
 */
function selectVariantsForCodes(
  codes: ClothingCategory[],
  variants: VariantSlimRow[],
  requiredWarmth: number,
  ageMonths: number,
  baby: SlotSwapBaby,
  options?: {
    preferSunHat?: boolean;
    zone?: ChecklistWarmthZone;
  }
): AdviceItem[] {
  const seenSlots = new Set<OutfitSlot>();
  const items: AdviceItem[] = [];

  for (const code of codes) {
    const slot = CATEGORY_TO_SLOT[code];
    if (!slot || seenSlots.has(slot)) continue;
    seenSlots.add(slot);

    const pool = poolForSlot(slot, ageMonths, variants);
    const swapPool = swapPoolForSlot(slot, variants);
    const preferSunHat = Boolean(options?.preferSunHat && code === "hat");
    const pickTarget = requiredWarmth;
    const picked = pickClosestVariant(variants, pool, pickTarget, {
      preferSunHat,
      rangeWarmth: requiredWarmth,
      preferSockHeight: slot === "socks" ? "mid_calf" : undefined,
    });
    if (!picked) continue;

    const item = variantToAdviceItem(picked, slot);
    const ranked = rankSlotAlternatives({
      current: picked,
      candidates: collectSlotSwapCandidates(
        variants,
        swapPool,
        picked,
        requiredWarmth,
        { preferSunHat }
      ),
      requiredWarmth: picked.warmth_value,
      baby,
    });
    if (ranked.length > 0) {
      item.alternatives = ranked.map((entry) => ({
        item: variantToAdviceItem(entry.variant, slot),
        reason: entry.reason,
        groupTier: entry.tier ?? "default",
      }));
      item.alternativeGroups = buildAlternativeGroups(
        item.alternatives,
        picked.category_code as ClothingCategory
      );
    }
    item.selectionVariants = collectChecklistCandidates(variants, swapPool, picked, requiredWarmth)
      .map((variant) => variantToAdviceItem(variant, slot));
    items.push(item);
  }

  return items;
}

export interface BuildCategoryAdviceInput {
  weather: WeatherSnapshot;
  baby: Pick<
    BabyProfile,
    "birthDate" | "activityLevel" | "warmthOffset" | "heightCm" | "weightKg" | "wearsDiaper"
  >;
  recommendedDate?: string;
  /**
   * When provided (non-empty), assemble the checklist from garment_variants:
   * band decides which slots appear; each slot picks the closest warmth_value
   * row among its category pool. Pass active rows from public.garment_variants.
   */
  variants?: VariantSlimRow[];
}

function buildLegacyCategoryAdvice(input: {
  weather: WeatherSnapshot;
  ageMonths: number;
  requiredWarmth: number;
  wearsDiaper?: boolean | null;
}): DressingAdvice {
  const { weather, ageMonths, requiredWarmth, wearsDiaper = null } = input;
  const band = pickBand(requiredWarmth);
  const indoorCodes = preferBodysuitIndoor(band.indoor, ageMonths);
  let outdoor = band.outdoor.filter((c) => !indoorCodes.includes(c));
  const uv = weather.uvIndex ?? 0;

  if (shouldAddSunProtection(uv, requiredWarmth)) {
    if (!outdoor.includes("hat") && !indoorCodes.includes("hat")) outdoor.unshift("hat");
    if (
      requiredWarmth < 45 &&
      !outdoor.includes("outer_uv") &&
      !indoorCodes.includes("outer_uv")
    ) {
      outdoor = ["outer_uv", ...outdoor.filter((c) => c !== "outer_uv")];
    }
  }
  outdoor = uniqueCategories(outdoor);

  const indoorItems: AdviceItem[] = [
    ...(shouldRecommendDiaper(ageMonths, wearsDiaper)
      ? [tipItem("diaper", "尿布", "Diaper")]
      : []),
    ...indoorCodes.map((code) => {
      const slot = CATEGORY_TO_SLOT[code];
      const item =
        code === "socks"
          ? (() => {
              const s = sockLabels(requiredWarmth);
              return categoryItem(code, s.zh, s.en);
            })()
          : categoryItem(code);
      if (slot) item.outfitSlot = slot;
      return item;
    }),
  ];

  const outdoorAdditions: AdviceItem[] = outdoor.map((code) => {
    const slot = CATEGORY_TO_SLOT[code];
    const item =
      code === "hat"
        ? (() => {
            const h = hatLabels(uv, requiredWarmth);
            return categoryItem(code, h.zh, h.en);
          })()
        : categoryItem(code);
    if (slot) item.outfitSlot = slot;
    return item;
  });

  const rain = rainFromWeather(weather);
  const extras: AdviceExtra[] = [];
  if (rain !== "none") {
    extras.push({
      type: "umbrella",
      reason: umbrellaReasonFromRain(rain),
      item: tipItem("umbrella", ADVICE_COPY.umbrellaLabel, "Umbrella"),
    });
  }

  applyOutfitIndex(indoorItems, outdoorAdditions, requiredWarmth);
  return {
    indoorItems,
    outdoorAdditions,
    extras,
    tags: resolveAdviceTipTags(weather),
    reason: formatAdviceConclusion({
      weather,
      requiredWarmth,
      indoorItems,
      outdoorAdditions,
      ageMonths,
      wearsDiaper,
    }),
    requiredWarmth,
    schemaVersion: BRIEF_ADVICE_SCHEMA_VERSION,
  };
}

function buildVariantCategoryAdvice(input: {
  weather: WeatherSnapshot;
  ageMonths: number;
  requiredWarmth: number;
  variants: VariantSlimRow[];
  baby: SlotSwapBaby;
  wearsDiaper?: boolean | null;
}): DressingAdvice {
  const { weather, ageMonths, requiredWarmth, variants, baby, wearsDiaper = null } = input;
  const band = pickBand(requiredWarmth);
  // Band still decides age-aware indoor category seeds (bodysuit vs tee expansion)
  const indoorSeeds = preferBodysuitIndoor(band.indoor, ageMonths);
  let outdoorSeeds = band.outdoor.filter((c) => !indoorSeeds.includes(c));
  const uv = weather.uvIndex ?? 0;

  if (shouldAddSunProtection(uv, requiredWarmth)) {
    if (!outdoorSeeds.includes("hat") && !indoorSeeds.includes("hat")) {
      outdoorSeeds = ["hat", ...outdoorSeeds];
    }
    if (
      requiredWarmth < 45 &&
      !outdoorSeeds.includes("outer_uv") &&
      !indoorSeeds.includes("outer_uv")
    ) {
      outdoorSeeds = ["outer_uv", ...outdoorSeeds.filter((c) => c !== "outer_uv")];
    }
  }
  outdoorSeeds = uniqueCategories(outdoorSeeds);

  const indoorFromVariants = selectVariantsForCodes(
    indoorSeeds,
    variants,
    requiredWarmth,
    ageMonths,
    baby,
    { zone: "indoor" }
  );
  const outdoorFromVariants = selectVariantsForCodes(
    outdoorSeeds,
    variants,
    requiredWarmth,
    ageMonths,
    baby,
    {
      preferSunHat: shouldAddSunProtection(uv, requiredWarmth) && requiredWarmth < 45,
      zone: "outdoor",
    }
  );

  // Avoid duplicating a category that already appeared indoors
  const indoorCats = new Set(indoorFromVariants.map((i) => i.category));
  const outdoorAdditions = outdoorFromVariants.filter(
    (i) => !i.category || !indoorCats.has(i.category)
  );

  const indoorItems: AdviceItem[] = [
    ...(shouldRecommendDiaper(ageMonths, wearsDiaper)
      ? [tipItem("diaper", "尿布", "Diaper")]
      : []),
    ...indoorFromVariants,
  ];
  const rain = rainFromWeather(weather);
  const extras: AdviceExtra[] = [];
  if (rain !== "none") {
    extras.push({
      type: "umbrella",
      reason: umbrellaReasonFromRain(rain),
      item: tipItem("umbrella", ADVICE_COPY.umbrellaLabel, "Umbrella"),
    });
  }

  // Prepare a bottom even when the initial one-piece outfit does not need one.
  // Strictly filter first so the legacy nearest-pick fallback cannot admit winterwear.
  const eligibleBottoms = variants.filter((v) => v.is_active &&
    categoriesInSlot("bottom", variants).includes(v.category_code) &&
    isClothingCategory(v.category_code) && isWarmthInCategoryRange(requiredWarmth, v.category_code) &&
    (!isWinterInsulatingVariant(v) || allowsWinterFabric(v.category_code, requiredWarmth)));
  const bottomSuggestion = eligibleBottoms.length ? selectVariantsForCodes(
    ["pants_short"], eligibleBottoms, requiredWarmth, ageMonths, baby, { zone: "indoor" }
  )[0] : undefined;

  applyOutfitIndex(indoorItems, outdoorAdditions, requiredWarmth);
  return {
    bottomSuggestion,
    indoorItems,
    outdoorAdditions,
    extras,
    tags: resolveAdviceTipTags(weather),
    reason: formatAdviceConclusion({
      weather,
      requiredWarmth,
      indoorItems,
      outdoorAdditions,
      ageMonths,
      wearsDiaper,
    }),
    requiredWarmth,
    schemaVersion: BRIEF_ADVICE_SCHEMA_VERSION,
  };
}

export function buildCategoryAdvice(input: BuildCategoryAdviceInput): DressingAdvice {
  const { weather, baby, variants } = input;
  const ageMonths = babyAgeInMonths(baby.birthDate);
  const wearsDiaper = baby.wearsDiaper ?? null;
  const requiredWarmth = calcRequiredWarmth({
    weather,
    baby,
    scenario: "outdoor",
    timeSlot: "morning",
    variant: "default",
  });

  const activeVariants = (variants ?? []).filter((v) => v.is_active);
  if (activeVariants.length > 0) {
    return buildVariantCategoryAdvice({
      weather,
      ageMonths,
      requiredWarmth,
      variants: activeVariants,
      baby,
      wearsDiaper,
    });
  }

  return buildLegacyCategoryAdvice({ weather, ageMonths, requiredWarmth, wearsDiaper });
}

export function buildBriefAdvice(input: {
  weather: WeatherSnapshot;
  baby: Pick<
    BabyProfile,
    "birthDate" | "activityLevel" | "warmthOffset" | "heightCm" | "weightKg" | "wearsDiaper"
  >;
  variants?: VariantSlimRow[];
}): BriefAdvice {
  const ageMonths = babyAgeInMonths(input.baby.birthDate);
  return {
    babyAgeMonths: ageMonths,
    schemaVersion: BRIEF_ADVICE_SCHEMA_VERSION,
    current: buildCategoryAdvice({
      weather: input.weather,
      baby: input.baby,
      variants: input.variants,
    }),
  };
}
