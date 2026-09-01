import type { ClothingCategory } from "./types";

/** Onion-layer order used by the outfit recommendation algorithm (0 = accessory/shoes). */
export const CATEGORY_LAYER_ORDER: Record<ClothingCategory, number> = {
  bodysuit_short: 1,
  bodysuit_long: 1,
  tshirt_short: 1,
  tshirt_long: 1,
  thermal_top: 1,
  sweater: 2,
  fleece_top: 2,
  vest: 2,
  vest_down: 2,
  outer_uv: 3,
  outer_shell: 3,
  outer_down: 3,
  outer_cotton: 3,
  long_johns: 1,
  pants_long: 1,
  pants_short: 1,
  pants_mid: 1,
  shoes_sandal: 0,
  shoes_sneaker: 0,
  shoes_leather: 0,
  shoes_boot: 0,
  hat: 0,
  socks: 0,
  gloves: 0,
  scarf: 0,
  other: 0,
};

export const CORE_OUTFIT_CATEGORIES: ClothingCategory[] = [
  "bodysuit_short",
  "bodysuit_long",
  "tshirt_short",
  "tshirt_long",
  "thermal_top",
  "sweater",
  "fleece_top",
  "vest",
  "vest_down",
  "long_johns",
  "pants_long",
  "pants_short",
  "pants_mid",
  "outer_uv",
  "outer_shell",
  "outer_down",
  "outer_cotton",
];

export const SLEEP_OUTFIT_CATEGORIES: ClothingCategory[] = [
  "bodysuit_long",
  "bodysuit_short",
  "long_johns",
  "thermal_top",
];

export const OUTERWEAR_CATEGORIES: ClothingCategory[] = [
  "outer_shell",
  "outer_down",
  "outer_cotton",
  "outer_uv",
];

export const ACCESSORY_CATEGORIES: ClothingCategory[] = ["hat", "socks", "gloves", "scarf"];

export function getCategoryLayerOrder(category: ClothingCategory): number {
  return CATEGORY_LAYER_ORDER[category] ?? 0;
}

export function isOuterwearCategory(category: ClothingCategory): boolean {
  return OUTERWEAR_CATEGORIES.includes(category);
}
