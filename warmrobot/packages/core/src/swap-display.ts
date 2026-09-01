/**
 * Slot-swap picker titles: other types in the same slot, not fabric/筒高 names.
 */
import {
  CATEGORY_DISPLAY_LABELS,
  type AdviceItem,
  type SlotSwapGroup,
  type SlotSwapOption,
} from "./daily-brief-types";
import type { ClothingCategory } from "./types";
import type { VariantSlimRow } from "./variant-types";

export type SwapAxis =
  | "category"
  | "sock_height"
  | "bodysuit_style"
  | "pant_length"
  | "fit_type"
  | "thickness"
  | "hat_kind";

export type SwapGroupTier = "primary_axis" | "material" | "default";

export type SwapAxisConfig = {
  primary: SwapAxis;
  primaryLabel: Record<string, string>;
  sectionTitles: { primary: string; secondary: string };
  axisBenefits?: Record<string, string>;
};

const BODYSUIT_SWAP: SwapAxisConfig = {
  primary: "bodysuit_style",
  primaryLabel: {
    triangle: "三角款",
    long_leg: "长裤款",
  },
  sectionTitles: { primary: "其他款式", secondary: "其他面料" },
  axisBenefits: {
    triangle: "换尿布更快",
    long_leg: "小腿更暖，不用另穿裤子",
  },
};

export const SWAP_AXIS_CONFIG: Partial<Record<ClothingCategory, SwapAxisConfig>> = {
  socks: {
    primary: "sock_height",
    primaryLabel: {
      no_show: "船袜",
      ankle: "短筒袜",
      mid_calf: "中筒袜",
      over_calf: "长筒袜",
    },
    sectionTitles: { primary: "其他筒高", secondary: "其他面料" },
    axisBenefits: {
      no_show: "更透气，鞋内容易散热",
      ankle: "透气、穿脱快",
      mid_calf: "覆盖更稳，不易下滑",
      over_calf: "明显减少小腿灌风",
    },
  },
  bodysuit_short: BODYSUIT_SWAP,
  bodysuit_long: BODYSUIT_SWAP,
  pants_long: {
    primary: "pant_length",
    primaryLabel: {
      nine_tenth: "九分裤",
      full_length: "全长裤",
    },
    sectionTitles: { primary: "其他裤长", secondary: "其他面料" },
    axisBenefits: {
      nine_tenth: "脚踝更透气",
      full_length: "风灌不进裤脚",
    },
  },
  hat: {
    primary: "hat_kind",
    primaryLabel: {
      sun: "遮阳帽",
      everyday: "日常帽",
      warm: "保暖帽",
    },
    sectionTitles: { primary: "其他帽型", secondary: "其他面料" },
    axisBenefits: {
      sun: "遮阳更安心",
      everyday: "日常好搭配",
      warm: "风里把头暖住",
    },
  },
};

const MATERIAL_ZH: Record<string, string> = {
  cotton: "纯棉",
  modal: "莫代尔",
  polyester: "速干面料",
  acrylic: "腈纶",
  wool: "羊毛",
  fleece: "抓绒",
  down: "羽绒",
};

const FIT_ZH: Record<string, string> = {
  slim: "修身",
  regular: "标准",
  loose: "宽松",
};

/** Functional pieces: the name already says the job, fabric chips add noise. */
const SKIP_MATERIAL_DETAIL = new Set<string>(["hat", "outer_uv", "shoes_sandal", "other"]);

export type SwapPickerRow = {
  title: string;
  detail: string | null;
  warmthValue: number | null;
  showWarmth: boolean;
};

function materialLabelZh(material: string | null | undefined): string | null {
  if (!material) return null;
  return MATERIAL_ZH[material] ?? material;
}

export function getSwapAxisValue(
  variant: VariantSlimRow,
  axis: SwapAxis
): string | null {
  switch (axis) {
    case "sock_height":
      return variant.sock_height ?? null;
    case "bodysuit_style":
      return variant.bodysuit_style ?? null;
    case "pant_length":
      return variant.pant_length ?? null;
    case "fit_type":
      return variant.fit_type ?? "regular";
    case "thickness":
      return variant.thickness ?? null;
    case "hat_kind":
      return variant.hat_kind ?? null;
    default:
      return null;
  }
}

export function buildSwapAxisReason(
  from: VariantSlimRow,
  to: VariantSlimRow,
  config: SwapAxisConfig
): string | null {
  const fromAxis = getSwapAxisValue(from, config.primary);
  const toAxis = getSwapAxisValue(to, config.primary);
  if (!toAxis || fromAxis === toAxis) return null;
  const label = config.primaryLabel[toAxis] ?? "这一款";
  const benefit = config.axisBenefits?.[toAxis] ?? "更适合今天";
  return `换成${label}：${benefit}`;
}

export function getAdviceAxisValue(item: AdviceItem, axis: SwapAxis): string | null {
  switch (axis) {
    case "sock_height":
      return item.sockHeight ?? null;
    case "bodysuit_style":
      return item.bodysuitStyle ?? null;
    case "pant_length":
      return item.pantLength ?? null;
    case "fit_type":
      return item.fitType ?? "regular";
    case "thickness":
      return item.thickness ?? null;
    case "hat_kind":
      return item.hatKind ?? null;
    case "category":
      return item.category ?? null;
    default:
      return null;
  }
}

function structuralTitle(item: AdviceItem): string | null {
  const config = item.category ? SWAP_AXIS_CONFIG[item.category] : undefined;
  if (!config) return null;
  const value = getAdviceAxisValue(item, config.primary);
  if (!value) return null;
  return config.primaryLabel[value] ?? null;
}

function categoryPickerTitle(item: AdviceItem): string {
  if (item.category && CATEGORY_DISPLAY_LABELS[item.category]) {
    return CATEGORY_DISPLAY_LABELS[item.category];
  }
  return item.label;
}

function currentDetailLine(item: AdviceItem, title: string): string | null {
  const parts: string[] = [];
  const struct = structuralTitle(item);
  if (struct && struct !== title) parts.push(struct);
  if (item.fitType && item.fitType !== "regular") {
    const fit = FIT_ZH[item.fitType];
    if (fit && fit !== title) parts.push(fit);
  }
  if (item.category && !SKIP_MATERIAL_DETAIL.has(item.category)) {
    const mat = materialLabelZh(item.material);
    if (mat && mat !== title) parts.push(mat);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function describeSwapCurrentRow(item: AdviceItem): SwapPickerRow {
  const title = categoryPickerTitle(item);
  return {
    title,
    detail: currentDetailLine(item, title),
    warmthValue: item.warmthValue ?? null,
    showWarmth: item.warmthValue != null,
  };
}

export function describeSwapOptionRow(
  option: SlotSwapOption,
  _current: AdviceItem
): SwapPickerRow {
  const item = option.item;
  let title = categoryPickerTitle(item);
  if (item.category === "socks" && option.groupTier === "primary_axis") {
    title = structuralTitle(item) ?? title;
  } else if (item.category === "socks" && option.groupTier === "material") {
    title = materialLabelZh(item.material) ?? title;
  }

  let detail = currentDetailLine(item, title);
  if (item.category === "socks" && option.groupTier === "material") {
    const struct = structuralTitle(item);
    detail = struct && struct !== title ? struct : null;
  }

  const warmthValue = item.warmthValue ?? null;
  return {
    title,
    detail: detail && detail !== title ? detail : null,
    warmthValue,
    showWarmth: warmthValue != null,
  };
}

export function inferSwapGroupTier(from: AdviceItem, to: AdviceItem): SwapGroupTier {
  const category = to.category ?? from.category;
  const config = category ? SWAP_AXIS_CONFIG[category] : undefined;
  if (config && from.category === to.category) {
    const fromAxis = getAdviceAxisValue(from, config.primary);
    const toAxis = getAdviceAxisValue(to, config.primary);
    if (fromAxis && toAxis && fromAxis !== toAxis) return "primary_axis";
    if ((from.material ?? "") !== (to.material ?? "")) return "material";
  }
  return "default";
}

export function rebuildAlternativeGroups(
  alternatives: SlotSwapOption[],
  category?: ClothingCategory
): SlotSwapGroup[] | undefined {
  const config = category ? SWAP_AXIS_CONFIG[category] : undefined;
  if (!config) return undefined;

  const primary: SlotSwapOption[] = [];
  const material: SlotSwapOption[] = [];
  const fallback: SlotSwapOption[] = [];

  for (const opt of alternatives) {
    if (opt.groupTier === "primary_axis") primary.push(opt);
    else if (opt.groupTier === "material") material.push(opt);
    else fallback.push(opt);
  }

  if (primary.length === 0 && material.length === 0) {
    return undefined;
  }

  const groups: SlotSwapGroup[] = [];
  if (primary.length > 0) {
    groups.push({ id: "primary_axis", title: config.sectionTitles.primary, options: primary });
  }
  if (material.length > 0) {
    groups.push({ id: "material", title: config.sectionTitles.secondary, options: material });
  }
  if (fallback.length > 0) {
    groups.push({ id: "default", title: "其他类型", options: fallback });
  }
  return groups.length > 0 ? groups : undefined;
}

export function buildAlternativeGroups(
  alternatives: SlotSwapOption[],
  category?: ClothingCategory
): SlotSwapGroup[] | undefined {
  return rebuildAlternativeGroups(alternatives, category);
}
