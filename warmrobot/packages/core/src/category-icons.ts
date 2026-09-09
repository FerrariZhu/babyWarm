import type { AdviceItem } from "./daily-brief-types";
import type { ClothingCategory } from "./types";

/** Old seed values are normalized so existing databases receive the corrected artwork. */
const LEGACY_CATEGORY_ICON_KEYS: Record<ClothingCategory, string> = {
  bodysuit_short: "checkroom",
  bodysuit_long: "checkroom",
  tshirt_short: "apparel",
  tshirt_long: "apparel",
  thermal_top: "layers",
  sweater: "sweater",
  fleece_top: "apparel",
  vest: "apparel",
  vest_down: "ac_unit",
  outer_uv: "sunny",
  outer_shell: "styler",
  outer_cotton: "styler",
  outer_down: "ac_unit",
  long_johns: "layers",
  pants_short: "styler",
  pants_mid: "styler",
  pants_long: "styler",
  shoes_sandal: "beach_access",
  shoes_sneaker: "steps",
  shoes_leather: "steps",
  shoes_boot: "hiking",
  hat: "sports_baseball",
  scarf: "styler",
  gloves: "back_hand",
  socks: "footprint",
  other: "category",
};

export const CATEGORY_ICON_KEYS = Object.fromEntries(
  Object.keys(LEGACY_CATEGORY_ICON_KEYS).map((code) => [code, `garment_${code}`])
) as Record<ClothingCategory, string>;

const SUPPORTED_SYMBOLS = new Set([
  "checkroom", "apparel", "layers", "styler", "sunny", "ac_unit", "steps",
  "beach_access", "hiking", "back_hand", "category", "dry_cleaning", "footprint",
  "sports_baseball", "umbrella", "tips_and_updates", "baby_changing_station",
]);

/** Shared by checklist and admin previews; unknown names never become visible text. */
export function categoryIconKey(code: string, key?: string | null): string {
  const fallback = Object.hasOwn(CATEGORY_ICON_KEYS, code)
    ? CATEGORY_ICON_KEYS[code as ClothingCategory] : "category";
  const candidate = key?.trim();
  if (!candidate || candidate === LEGACY_CATEGORY_ICON_KEYS[code as ClothingCategory]
    || candidate === "socks" || candidate === "sweater") return fallback;
  return Object.values(CATEGORY_ICON_KEYS).includes(candidate) || SUPPORTED_SYMBOLS.has(candidate)
    ? candidate : fallback;
}

export type CategoryIconMeta = {
  iconKey: string;
  iconUrl?: string | null;
};

function tipIcon(item: AdviceItem): string {
  if (item.id === "diaper") return "garment_diaper";
  if (item.id === "umbrella") return "umbrella";
  return "tips_and_updates";
}

/** Preserve custom images and supported overrides while upgrading old seed icons. */
export function resolveCategoryIcon(
  item: AdviceItem,
  overrides?: Record<string, CategoryIconMeta>
): CategoryIconMeta {
  if (item.kind === "tip") {
    return { iconKey: tipIcon(item) };
  }

  const code = item.category;
  if (!code) {
    return { iconKey: "category" };
  }

  const fromDb = overrides?.[code];
  if (fromDb?.iconUrl?.trim()) {
    return { iconKey: categoryIconKey(code, fromDb.iconKey), iconUrl: fromDb.iconUrl.trim() };
  }
  const iconKey = categoryIconKey(code, fromDb?.iconKey);
  if (code === "hat" && iconKey === CATEGORY_ICON_KEYS.hat) {
    if (item.hatKind === "sun") return { iconKey: "garment_hat_sun" };
    if (item.hatKind === "warm") return { iconKey: "garment_hat_warm" };
  }
  return { iconKey };
}
