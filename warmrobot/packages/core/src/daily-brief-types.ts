import type { AdviceTipTag } from "./advice-tip-tags";
import type { ClothingCategory } from "./types";

/** Display names aligned with docs/specs/enums.md */
export const CATEGORY_DISPLAY_LABELS: Record<ClothingCategory, string> = {
  bodysuit_short: "短袖包屁衣",
  bodysuit_long: "长袖包屁衣",
  tshirt_short: "短袖 T 恤",
  tshirt_long: "长袖 T 恤",
  thermal_top: "秋衣",
  sweater: "毛衣/针织",
  fleece_top: "卫衣/抓绒",
  vest: "马甲/背心",
  vest_down: "羽绒马甲",
  outer_uv: "防晒衣",
  outer_shell: "春秋外套",
  outer_cotton: "棉衣",
  outer_down: "羽绒服",
  long_johns: "秋裤",
  pants_short: "短裤",
  pants_mid: "中裤",
  pants_long: "长裤",
  shoes_sandal: "凉鞋",
  shoes_sneaker: "运动鞋",
  shoes_leather: "皮鞋",
  shoes_boot: "高帮靴",
  hat: "帽子",
  scarf: "围巾",
  gloves: "手套",
  socks: "袜子",
  other: "其他",
};

/** English display names — catalog tone for C-end (shown beside Chinese). */
export const CATEGORY_DISPLAY_LABELS_EN: Record<ClothingCategory, string> = {
  bodysuit_short: "Short-Sleeve Bodysuit",
  bodysuit_long: "Long-Sleeve Bodysuit",
  tshirt_short: "Short-Sleeve T-Shirt",
  tshirt_long: "Long-Sleeve T-Shirt",
  thermal_top: "Thermal Undershirt",
  sweater: "Knit Sweater",
  fleece_top: "Fleece Top",
  vest: "Vest",
  vest_down: "Down Vest",
  outer_uv: "UV Protection Jacket",
  outer_shell: "Light Jacket",
  outer_cotton: "Padded Jacket",
  outer_down: "Down Jacket",
  long_johns: "Thermal Leggings",
  pants_short: "Shorts",
  pants_mid: "Cropped Pants",
  pants_long: "Long Pants",
  shoes_sandal: "Sandals",
  shoes_sneaker: "Sneakers",
  shoes_leather: "Leather Shoes",
  shoes_boot: "High-Top Boots",
  hat: "Hat",
  scarf: "Scarf",
  gloves: "Gloves",
  socks: "Socks",
  other: "Other",
};

/**
 * @deprecated Planning horizon removed from product; kept only if callers still import.
 */
export const TODAY_ADVICE_HORIZON_HOURS = 8;

export type AdviceItemKind = "tip" | "category";

/** One same-slot alternative the parent can 换一换 into. Nested item has no alternatives. */
export interface SlotSwapOption {
  item: AdviceItem;
  /** One-line benefit, e.g. 换成莫代尔：体感更凉，出汗更快干 */
  reason: string;
  /** L2 structural axis vs L3 material tweak — drives grouped popover sections. */
  groupTier?: "primary_axis" | "material" | "default";
  /** Popover: omit redundant material chip when label already encodes structure. */
  hideMaterialChip?: boolean;
}

/** Grouped section in the slot swap popover (flat `alternatives` is the concatenation). */
export interface SlotSwapGroup {
  id: string;
  title: string;
  options: SlotSwapOption[];
}

export interface AdviceItem {
  kind: AdviceItemKind;
  /** tip: stable code (diaper, umbrella); category: `cat:${ClothingCategory}` */
  id: string;
  /** Chinese primary title on checklist cards (variant short name). */
  label: string;
  /** English type name under the Chinese title on checklist cards. */
  labelEn?: string;
  /**
   * Variant feature line under English (e.g. `厚棉保暖·宽松`).
   * Parsed from `consumer_label` when assembled from garment_variants.
   */
  subtitle?: string;
  category?: ClothingCategory;
  /** Outfit slot this card fills — 换一换 stays inside the slot. */
  outfitSlot?: string;
  material?: string | null;
  thickness?: string | null;
  fitType?: string | null;
  bodysuitStyle?: string | null;
  sockHeight?: string | null;
  pantLength?: string | null;
  hatKind?: string | null;
  /** Weighted card contribution; all garment cards sum to requiredWarmth. */
  warmthValue?: number;
  /** Original variant score, kept separate from the allocated card contribution. */
  baseWarmthValue?: number;
  /** Short pros/cons for checklist card (compact display). */
  pros?: string;
  cons?: string;
  /** Ranked same-slot looks; omitted on saved dressing records. */
  alternatives?: SlotSwapOption[];
  /** Flat, weather-filtered variant pool, anchored to the original recommendation. */
  selectionVariants?: AdviceItem[];
  autoAddedBottom?: boolean;
  userModified?: boolean;
  /** Popover sections; options mirror `alternatives` order when flattened. */
  alternativeGroups?: SlotSwapGroup[];
}

/** One variant pros/cons card for the checklist half-sheet. */
export type VariantCopyCard = {
  id: string;
  categoryCode: string;
  title: string;
  subtitle?: string;
  labelEn?: string;
  pros: string;
  cons: string;
  usageTips: string;
  warmthValue: number;
  sortOrder: number;
  isRecommended?: boolean;
};

export interface AdviceExtra {
  type: string;
  reason: string;
  item?: AdviceItem;
}

/**
 * Bump when checklist assembly / payload shape changes so cached home_daily_briefs
 * regenerate (e.g. garment_variants-driven labels, conclusion 大类 names, slot 换一换).
 */
export const BRIEF_ADVICE_SCHEMA_VERSION = 27;

/** One dressing checklist (indoor / outdoor / extras). */
export interface DressingAdvice {
  /** Eligible default and fixed choices for completing an outfit after a top swap. */
  bottomSuggestion?: AdviceItem;
  indoorItems: AdviceItem[];
  outdoorAdditions: AdviceItem[];
  extras: AdviceExtra[];
  /** Weather-threshold tip chips — shown in 天气模块, not in 穿搭建议. */
  tags: AdviceTipTag[];
  reason?: string;
  requiredWarmth: number;
  /** Present on newly generated advice; used by isBriefAdviceCurrent. */
  schemaVersion?: number;
}

/**
 * @deprecated Prefer DressingAdvice; kept for transitional typing.
 * Same shape as DressingAdvice plus optional baby fields when used as a standalone block.
 */
export type DailyAdvice = DressingAdvice & {
  babyAgeMonths?: number;
};

/** Brief advice from real-time weather only. */
export interface BriefAdvice {
  babyAgeMonths: number;
  current: DressingAdvice;
  schemaVersion?: number;
}

export interface HomeDailyBriefWeather {
  observedAt: string;
  locationLabel: string;
  conditionText: string;
  temp: number;
  feelsLike: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  precipProbability?: number;
}

export interface HomeDailyBrief {
  babyId: string;
  recommendedDate: string;
  generatedAt: string;
  weather: HomeDailyBriefWeather;
  advice: BriefAdvice;
}

/**
 * Snapshot schema check — dual `current`+`today` briefs are stale and must regenerate.
 * Briefs without tip `tags` (pre-tip-tag schema) are also stale.
 * Briefs with schemaVersion < BRIEF_ADVICE_SCHEMA_VERSION must regenerate
 * (variant-driven checklist).
 */
export function isBriefAdviceCurrent(advice: unknown): advice is BriefAdvice {
  if (!advice || typeof advice !== "object") return false;
  const a = advice as Record<string, unknown>;
  if (a.today != null) return false;
  if (a.current == null || typeof a.current !== "object") return false;
  const current = a.current as Record<string, unknown>;
  if (!Array.isArray(current.tags)) return false;
  const version =
    typeof a.schemaVersion === "number"
      ? a.schemaVersion
      : typeof current.schemaVersion === "number"
        ? current.schemaVersion
        : 0;
  if (version < BRIEF_ADVICE_SCHEMA_VERSION) return false;
  return true;
}

/** @deprecated Use isBriefAdviceCurrent */
export const isBriefAdviceV2 = isBriefAdviceCurrent;
