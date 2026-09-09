/**
 * Same-slot outfit alternatives: other clothing *types* with similar warmth.
 * Fabric / 筒高 / 帽型 tweaks are not offered — those are not a replacement.
 */
import type { AdviceItem, SlotSwapOption } from "./daily-brief-types";
import type { ActivityLevel, ClothingCategory } from "./types";
import {
  SWAP_CROSS_CATEGORY_DELTA_MAX,
  SWAP_WARMTH_DELTA_MAX,
  swapWarmthDeltaMax,
  type VariantSlimRow,
} from "./variant-types";
import {
  buildSwapAxisReason,
  getSwapAxisValue,
  inferSwapGroupTier,
  rebuildAlternativeGroups,
  SWAP_AXIS_CONFIG,
  type SwapGroupTier,
} from "./swap-display";

/** Max alternatives shown in the slot picker (one per other category). */
export const MAX_SLOT_ALTERNATIVES = 8;

/**
 * Weather-job pieces: the slot is the function, not a type you swap.
 * 遮阳帽 / 防晒衣 have no same-slot replacement the parent would pick instead.
 */
export const FUNCTIONAL_SWAP_CATEGORIES = new Set<string>(["hat", "outer_uv"]);

/** Socks are a single category — 筒高 swaps use structural axis, not cross-type. */
const SOCK_SWAP_CATEGORY = "socks";

const MAX_SOCK_MATERIAL_ALTERNATIVES = 2;

export { SWAP_CROSS_CATEGORY_DELTA_MAX, SWAP_WARMTH_DELTA_MAX };
export {
  buildAlternativeGroups,
  describeSwapCurrentRow,
  describeSwapOptionRow,
  inferSwapGroupTier,
  rebuildAlternativeGroups,
  SWAP_AXIS_CONFIG,
} from "./swap-display";
export type { SwapAxisConfig, SwapGroupTier, SwapPickerRow } from "./swap-display";

export type SlotSwapBaby = {
  activityLevel: ActivityLevel;
  heightCm?: number | null;
  weightKg?: number | null;
};

export type RankedSlotVariant = {
  variant: VariantSlimRow;
  reason: string;
  tier?: SwapGroupTier;
};

export function isCottonMaterial(material: string | null | undefined): boolean {
  return material === "cotton";
}

/** If the type has cotton rows, show those; otherwise keep the full group. */
export function cottonPreferredPool(
  group: readonly VariantSlimRow[]
): VariantSlimRow[] {
  const cotton = group.filter((v) => isCottonMaterial(v.material));
  return cotton.length > 0 ? cotton : [...group];
}

/** Closest to target warmth; cotton first when the type has it. */
export function pickClosestWarmth(
  group: readonly VariantSlimRow[],
  targetWarmth: number,
  options?: { preferSockHeight?: string | null }
): VariantSlimRow | null {
  const pool = cottonPreferredPool(group);
  if (pool.length === 0) return null;

  const heightPool =
    options?.preferSockHeight != null
      ? pool.filter((v) => v.sock_height === options.preferSockHeight)
      : [];
  const candidates = heightPool.length > 0 ? heightPool : pool;

  return candidates.reduce((best, v) => {
    const dv = Math.abs(v.warmth_value - targetWarmth);
    const db = Math.abs(best.warmth_value - targetWarmth);
    if (dv < db) return v;
    if (dv > db) return best;
    return v.sort_order < best.sort_order ? v : best;
  });
}

export function variantIdentity(v: VariantSlimRow): string {
  return [
    v.category_code,
    v.material ?? "",
    v.thickness ?? "",
    v.fit_type ?? "",
    v.sock_height ?? "",
    v.bodysuit_style ?? "",
    v.pant_length ?? "",
    v.fill_type ?? "",
    v.consumer_label,
  ].join("|");
}

const MATERIAL_ZH: Record<string, string> = {
  cotton: "纯棉",
  modal: "莫代尔",
  polyester: "速干面料",
  acrylic: "腈纶",
  wool: "羊毛",
  fleece: "抓绒",
  down: "羽绒",
};

const MATERIAL_BENEFIT: Record<string, string> = {
  cotton: "亲肤透气，日常最省心",
  modal: "体感更凉，出汗更快干",
  polyester: "轻薄速干，活动更利落",
  acrylic: "更轻软，好打理",
  wool: "更暖，风里更安心",
  fleece: "抓绒更暖，室内也够",
  down: "更暖，出门挡寒",
};

function preferredFit(baby: SlotSwapBaby): "slim" | "regular" | "loose" {
  const { activityLevel, heightCm, weightKg } = baby;
  if (heightCm && heightCm > 0 && weightKg && weightKg > 0) {
    const meters = heightCm / 100;
    const bmi = weightKg / (meters * meters);
    if (bmi >= 18) return "loose";
    if (bmi <= 15 && activityLevel !== "high") return "slim";
  }
  if (activityLevel === "high") return "loose";
  return "regular";
}

function breathableScore(material: string | null | undefined, activity: ActivityLevel): number {
  const m = material ?? "";
  if (activity === "high") {
    if (m === "modal") return 4;
    if (m === "polyester") return 3;
    if (m === "cotton") return 1;
    return 0;
  }
  if (activity === "low") {
    if (m === "cotton") return 3;
    if (m === "modal") return 1;
    return 0;
  }
  if (m === "cotton" || m === "modal") return 2;
  if (m === "polyester") return 1;
  return 0;
}

export function materialLabelZh(material: string | null | undefined): string | null {
  if (!material) return null;
  return MATERIAL_ZH[material] ?? material;
}

const FIT_ZH: Record<string, string> = {
  slim: "修身",
  regular: "标准",
  loose: "宽松",
};

export function fitLabelZh(fitType: string | null | undefined): string | null {
  if (!fitType || fitType === "regular") return null;
  return FIT_ZH[fitType] ?? fitType;
}

/** Checklist card chip line, e.g. 纯棉 · 宽松 */
export function formatMaterialFitLine(
  material: string | null | undefined,
  fitType: string | null | undefined
): string | null {
  const parts = [materialLabelZh(material), fitLabelZh(fitType)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** C-end picker line: 名称 · 材料 · 款式 · 指数 N */
export function formatSlotSwapOptionLabel(item: AdviceItem): string {
  const material = materialLabelZh(item.material);
  const warmth =
    item.warmthValue != null ? `指数 ${item.warmthValue}` : null;
  return [item.label, material, item.subtitle, warmth].filter(Boolean).join(" · ");
}

export function buildSwapReason(from: VariantSlimRow, to: VariantSlimRow): string {
  if (from.category_code !== to.category_code) {
    const typeHint =
      from.category_code.startsWith("pants_") && to.category_code.startsWith("pants_")
        ? "裤型"
        : "类型";
    return `换成这个${typeHint}：同一层，保暖接近`;
  }

  const axisConfig = SWAP_AXIS_CONFIG[from.category_code as ClothingCategory];
  if (axisConfig) {
    const axisReason = buildSwapAxisReason(from, to, axisConfig);
    if (axisReason) return axisReason;
  }

  if ((from.material ?? "") !== (to.material ?? "") && to.material) {
    const name = MATERIAL_ZH[to.material] ?? "这个面料";
    const benefit = MATERIAL_BENEFIT[to.material] ?? "体感更合适";
    return `换成${name}：${benefit}`;
  }
  if ((from.fit_type ?? "regular") !== (to.fit_type ?? "regular")) {
    if (to.fit_type === "loose") return "换成宽松版：爬走更自在";
    if (to.fit_type === "slim") return "换成修身版：更贴身，好叠穿";
    return "换成常规版：版型端正，好搭配";
  }
  if ((from.thickness ?? "") !== (to.thickness ?? "")) {
    if (to.thickness === "thin") return "换成薄款：更透气，不容易闷热";
    if (to.thickness === "thick") return "换成厚款：风里更安心";
    return "换成中厚：厚薄更适中";
  }
  return "换成这一款：更适合今天";
}

function scoreCandidate(
  current: VariantSlimRow,
  candidate: VariantSlimRow,
  requiredWarmth: number,
  baby: SlotSwapBaby
): number {
  const warmthDelta = Math.abs(candidate.warmth_value - requiredWarmth);
  const material = breathableScore(candidate.material, baby.activityLevel);
  const fitWanted = preferredFit(baby);
  const fit = candidate.fit_type === fitWanted ? 4 : candidate.fit_type === "regular" ? 1 : 0;
  const distinct =
    (candidate.material !== current.material ? 3 : 0) +
    (candidate.fit_type !== current.fit_type ? 2 : 0) +
    (candidate.thickness !== current.thickness ? 1 : 0);
  return material + fit + distinct - warmthDelta;
}

function filterEligible(current: VariantSlimRow, candidates: VariantSlimRow[]): VariantSlimRow[] {
  const currentId = variantIdentity(current);
  const anchorWarmth = current.warmth_value;
  return candidates.filter((v) => {
    if (!v.is_active) return false;
    if (variantIdentity(v) === currentId) return false;
    const delta = swapWarmthDeltaMax(current.category_code, v.category_code);
    return Math.abs(v.warmth_value - anchorWarmth) <= delta;
  });
}

function pickBestInGroup(
  current: VariantSlimRow,
  group: VariantSlimRow[],
  requiredWarmth: number,
  baby: SlotSwapBaby
): VariantSlimRow | null {
  const pool = cottonPreferredPool(group);
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => {
    const sa = scoreCandidate(current, a, requiredWarmth, baby);
    const sb = scoreCandidate(current, b, requiredWarmth, baby);
    if (sb !== sa) return sb - sa;
    const da = Math.abs(a.warmth_value - requiredWarmth);
    const db = Math.abs(b.warmth_value - requiredWarmth);
    if (da !== db) return da - db;
    return a.sort_order - b.sort_order;
  });
  return sorted[0] ?? null;
}

function rankAcrossCategories(
  current: VariantSlimRow,
  eligible: VariantSlimRow[],
  requiredWarmth: number,
  baby: SlotSwapBaby
): RankedSlotVariant[] {
  const byCategory = new Map<string, VariantSlimRow[]>();
  for (const v of eligible) {
    const list = byCategory.get(v.category_code) ?? [];
    list.push(v);
    byCategory.set(v.category_code, list);
  }

  const picks: RankedSlotVariant[] = [];
  for (const [, group] of byCategory) {
    const best = pickBestInGroup(current, group, requiredWarmth, baby);
    if (!best) continue;
    picks.push({
      variant: best,
      reason: buildSwapReason(current, best),
      tier: "default",
    });
  }

  return picks
    .sort((a, b) => {
      const da = Math.abs(a.variant.warmth_value - requiredWarmth);
      const db = Math.abs(b.variant.warmth_value - requiredWarmth);
      if (da !== db) return da - db;
      return a.variant.sort_order - b.variant.sort_order;
    })
    .slice(0, MAX_SLOT_ALTERNATIVES);
}

function rankSockAlternatives(
  current: VariantSlimRow,
  eligible: VariantSlimRow[],
  requiredWarmth: number,
  baby: SlotSwapBaby
): RankedSlotVariant[] {
  const config = SWAP_AXIS_CONFIG.socks;
  if (!config) return [];

  const currentAxis = getSwapAxisValue(current, config.primary);
  const byAxis = new Map<string, VariantSlimRow[]>();
  for (const v of eligible) {
    const axisValue = getSwapAxisValue(v, config.primary);
    if (!axisValue) continue;
    const list = byAxis.get(axisValue) ?? [];
    list.push(v);
    byAxis.set(axisValue, list);
  }

  const primaryPicks: RankedSlotVariant[] = [];
  for (const [axisValue, group] of byAxis) {
    if (axisValue === currentAxis) continue;
    const best = pickBestInGroup(current, group, requiredWarmth, baby);
    if (!best) continue;
    primaryPicks.push({
      variant: best,
      reason: buildSwapReason(current, best),
      tier: "primary_axis",
    });
  }

  primaryPicks.sort((a, b) => {
    const da = Math.abs(a.variant.warmth_value - requiredWarmth);
    const db = Math.abs(b.variant.warmth_value - requiredWarmth);
    if (da !== db) return da - db;
    return a.variant.sort_order - b.variant.sort_order;
  });

  const sameAxis = eligible.filter(
    (v) => getSwapAxisValue(v, config.primary) === currentAxis
  );
  const byMaterial = new Map<string, VariantSlimRow[]>();
  for (const v of sameAxis) {
    const mat = v.material ?? "";
    if (!mat || mat === (current.material ?? "")) continue;
    const list = byMaterial.get(mat) ?? [];
    list.push(v);
    byMaterial.set(mat, list);
  }

  const materialPicks: RankedSlotVariant[] = [];
  for (const [, group] of byMaterial) {
    const best = pickBestInGroup(current, group, requiredWarmth, baby);
    if (!best) continue;
    materialPicks.push({
      variant: best,
      reason: buildSwapReason(current, best),
      tier: "material",
    });
  }

  materialPicks.sort((a, b) => {
    const sa = scoreCandidate(current, a.variant, requiredWarmth, baby);
    const sb = scoreCandidate(current, b.variant, requiredWarmth, baby);
    if (sb !== sa) return sb - sa;
    return a.variant.sort_order - b.variant.sort_order;
  });

  return [...primaryPicks, ...materialPicks.slice(0, MAX_SOCK_MATERIAL_ALTERNATIVES)].slice(
    0,
    MAX_SLOT_ALTERNATIVES
  );
}

export function rankSlotAlternatives(input: {
  current: VariantSlimRow;
  candidates: VariantSlimRow[];
  requiredWarmth: number;
  baby: SlotSwapBaby;
}): RankedSlotVariant[] {
  if (FUNCTIONAL_SWAP_CATEGORIES.has(input.current.category_code)) return [];

  const eligible = filterEligible(input.current, input.candidates).filter(
    (v) => !FUNCTIONAL_SWAP_CATEGORIES.has(v.category_code)
  );
  const otherTypes = eligible.filter(
    (v) => v.category_code !== input.current.category_code
  );
  if (otherTypes.length > 0) {
    return rankAcrossCategories(
      input.current,
      otherTypes,
      input.requiredWarmth,
      input.baby
    );
  }

  if (input.current.category_code === SOCK_SWAP_CATEGORY) {
    return rankSockAlternatives(
      input.current,
      eligible,
      input.requiredWarmth,
      input.baby
    );
  }

  return [];
}

function stripAlternatives(item: AdviceItem): AdviceItem {
  const { alternatives: _drop, alternativeGroups: _groups, ...rest } = item;
  return rest;
}

/** Apply a user-picked slot alternative; park the previous look in the option ring. */
export function applySlotSwap(item: AdviceItem, selectedIndex: number): AdviceItem | null {
  const alternatives = item.alternatives;
  const selected = alternatives?.[selectedIndex];
  if (!selected || !alternatives) return null;

  const previous: SlotSwapOption = {
    item: stripAlternatives(item),
    reason: buildSwapReasonFromItems(selected.item, item) ?? "换回刚才那件",
    groupTier: inferSwapGroupTier(item, selected.item),
  };
  const others = alternatives
    .filter((_, index) => index !== selectedIndex)
    .map((alt) => ({ ...alt, item: stripAlternatives(alt.item) }));

  const nextAlternatives = [...others, previous];
  const nextGroups = rebuildAlternativeGroups(nextAlternatives, item.category);

  return {
    ...selected.item,
    alternatives: nextAlternatives,
    alternativeGroups: nextGroups,
  };
}

/** @deprecated Prefer applySlotSwap with an explicit picker index. */
export function rotateSlotSwap(
  item: AdviceItem
): { item: AdviceItem; reason: string } | null {
  const next = applySlotSwap(item, 0);
  if (!next) return null;
  const reason = item.alternatives?.[0]?.reason ?? "已更换";
  return { item: next, reason };
}

function buildSwapReasonFromItems(from: AdviceItem, to: AdviceItem): string | null {
  const fakeFrom: VariantSlimRow = {
    category_code: from.category ?? "",
    warmth_value: 0,
    consumer_label: from.label,
    sort_order: 0,
    is_active: true,
    material: from.material ?? null,
    thickness: from.thickness ?? null,
    fit_type: from.fitType ?? null,
    bodysuit_style: from.bodysuitStyle ?? null,
    sock_height: from.sockHeight ?? null,
    pant_length: from.pantLength ?? null,
    hat_kind: from.hatKind ?? null,
  };
  const fakeTo: VariantSlimRow = {
    category_code: to.category ?? "",
    warmth_value: 0,
    consumer_label: to.label,
    sort_order: 0,
    is_active: true,
    material: to.material ?? null,
    thickness: to.thickness ?? null,
    fit_type: to.fitType ?? null,
    bodysuit_style: to.bodysuitStyle ?? null,
    sock_height: to.sockHeight ?? null,
    pant_length: to.pantLength ?? null,
    hat_kind: to.hatKind ?? null,
  };
  return buildSwapReason(fakeFrom, fakeTo);
}
