import { getCategoryLabel } from "@/lib/clothing-categories";

const CATEGORY_STRUCTURE_HINTS: Record<string, string> = {
  bodysuit_short: "short-sleeve bodysuit",
  bodysuit_long: "long-sleeve bodysuit",
  tshirt_short: "short-sleeve t-shirt",
  tshirt_long: "long-sleeve t-shirt",
  thermal_top: "long-sleeve thermal top",
  sweater: "long-sleeve sweater",
  fleece_top: "long-sleeve fleece top",
  vest: "sleeveless vest",
  outer_uv: "long-sleeve lightweight outerwear",
  outer_shell: "long-sleeve jacket",
  outer_cotton: "long-sleeve padded cotton jacket",
  outer_down: "long-sleeve down jacket",
};

export function buildGarmentPreserveHint(options: {
  category?: string | null;
  name?: string | null;
  regionDescription?: string | null;
  colorHint?: string | null;
}): string | null {
  const parts: string[] = [];

  const categoryHint = options.category ? CATEGORY_STRUCTURE_HINTS[options.category] : null;
  const categoryLabel = options.category ? getCategoryLabel(options.category) : null;

  if (categoryHint) {
    parts.push(categoryHint);
  } else if (categoryLabel && categoryLabel !== options.category) {
    parts.push(categoryLabel);
  }

  if (options.name?.trim()) {
    parts.push(options.name.trim());
  }

  if (options.colorHint?.trim()) {
    parts.push(`${options.colorHint.trim()} color`);
  }

  if (options.regionDescription?.trim()) {
    parts.push(options.regionDescription.trim());
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
