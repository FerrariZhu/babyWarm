import type { AdviceItem } from "./daily-brief-types";
import type { ClothingCategory } from "./types";

/** Default Material Symbols icon_key per category — mirrors migration 000017 seed. */
export const CATEGORY_ICON_KEYS: Record<ClothingCategory, string> = {
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
  socks: "socks",
  other: "category",
};

export type CategoryIconMeta = {
  iconKey: string;
  iconUrl?: string | null;
};

function tipIcon(item: AdviceItem): string {
  if (item.id === "diaper") return "baby_changing_station";
  if (item.id === "umbrella") return "umbrella";
  return "tips_and_updates";
}

/** Resolve checklist card icon — DB overrides win, then seed map, then generic fallback. */
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
    return { iconKey: fromDb.iconKey || "category", iconUrl: fromDb.iconUrl.trim() };
  }
  if (fromDb?.iconKey?.trim()) {
    return { iconKey: fromDb.iconKey.trim() };
  }

  return { iconKey: CATEGORY_ICON_KEYS[code] ?? "category" };
}
