import { CATEGORY_DISPLAY_LABELS } from "@warmrobot/core/admin";

export const OUTFIT_SLOTS = [
  { value: "base_top", label: "内上" },
  { value: "mid_top", label: "中上" },
  { value: "outer", label: "外上" },
  { value: "base_bottom", label: "内下" },
  { value: "bottom", label: "外下" },
  { value: "socks", label: "袜" },
  { value: "shoes", label: "鞋" },
  { value: "hat", label: "帽" },
  { value: "scarf", label: "围巾" },
  { value: "gloves", label: "手套" },
  { value: "other", label: "其他" },
] as const;

export type OutfitSlot = (typeof OUTFIT_SLOTS)[number]["value"];

/** Shared clothing silhouettes plus supported optional Material Symbols. */
export const PRESET_ICONS = [
  ...Object.entries(CATEGORY_DISPLAY_LABELS).map(([code, label]) => ({ value: `garment_${code}`, label })),
  { value: "checkroom", label: "衣帽间" },
  { value: "apparel", label: "服装" },
  { value: "layers", label: "多层叠穿" },
  { value: "styler", label: "穿搭造型" },
  { value: "sunny", label: "防晒/晴天" },
  { value: "ac_unit", label: "保暖/羽绒" },
  { value: "steps", label: "运动鞋" },
  { value: "beach_access", label: "沙滩伞" },
  { value: "hiking", label: "徒步" },
  { value: "back_hand", label: "手套" },
  { value: "category", label: "通用/其他" },
  { value: "dry_cleaning", label: "衣物护理" },
  { value: "footprint", label: "脚印" },
] as const;

export type PresetIconKey = (typeof PRESET_ICONS)[number]["value"];

export const PRESET_ICON_KEYS = PRESET_ICONS.map((icon) => icon.value);

export type CategoryProductLink = {
  id: string;
  url: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AdminCategory = {
  id: string;
  code: string;
  name_zh: string;
  name_en: string | null;
  /** Required — every category must have a concrete outfit slot. */
  outfit_slot: OutfitSlot;
  warmth_min: number;
  warmth_max: number;
  icon_key: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_links: CategoryProductLink[];
};

export function outfitSlotLabel(value: string | null | undefined): string {
  return OUTFIT_SLOTS.find((s) => s.value === value)?.label ?? "—";
}

const CODE_RE = /^[a-z][a-z0-9_]{1,62}$/;

export function isValidCategoryCode(code: string): boolean {
  return CODE_RE.test(code);
}
