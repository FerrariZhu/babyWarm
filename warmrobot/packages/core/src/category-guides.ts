import type { AdviceItem } from "./daily-brief-types";
import type { ClothingCategory } from "./types";

export type GuideAxis =
  | "material"
  | "fit_type"
  | "bodysuit_style"
  | "pant_length"
  | "sock_height"
  | "hat_kind"
  | "thickness";

export type CategoryGuideEntry = {
  axis: GuideAxis;
  value: string;
  label: string;
  pros: string[];
  cautions: string[];
  sortOrder: number;
  /** Approved visual asset resolved by the server. Omitted when an asset is not ready. */
  imageUrl?: string;
  imageAlt?: string;
};

export type CategoryGuideContent = {
  categoryCode: string;
  intro: string;
  /** Approved category overview image resolved by the server. */
  imageUrl?: string;
  imageAlt?: string;
  styles: CategoryGuideEntry[];
  materials: CategoryGuideEntry[];
};

export type CategoryGuideViewEntry = CategoryGuideEntry & {
  isSelected: boolean;
};

export type CategoryGuideView = {
  intro: string;
  imageUrl?: string;
  imageAlt?: string;
  styles: CategoryGuideViewEntry[];
  materials: CategoryGuideViewEntry[];
};

type GuideSelection = Pick<
  AdviceItem,
  | "category"
  | "material"
  | "fitType"
  | "bodysuitStyle"
  | "pantLength"
  | "sockHeight"
  | "hatKind"
  | "thickness"
>;

function selectedValue(entry: CategoryGuideEntry, item: GuideSelection): string | null {
  switch (entry.axis) {
    case "material":
      return item.material ?? null;
    case "fit_type":
      return item.fitType ?? null;
    case "bodysuit_style":
      return item.bodysuitStyle ?? null;
    case "pant_length":
      return item.pantLength ?? null;
    case "sock_height":
      return item.sockHeight ?? null;
    case "hat_kind":
      return item.hatKind ?? null;
    case "thickness":
      return item.thickness ?? null;
  }
}

function sortGuideEntries(
  entries: CategoryGuideEntry[],
  item: GuideSelection
): CategoryGuideViewEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      pros: [...entry.pros],
      cautions: [...entry.cautions],
      isSelected: selectedValue(entry, item) === entry.value,
    }))
    .sort((a, b) => Number(b.isSelected) - Number(a.isSelected) || a.sortOrder - b.sortOrder);
}

/**
 * Creates the content order for the clothing guide sheet.
 * The selected attribute leads its group, while all other valid choices stay visible.
 */
export function buildCategoryGuideView(
  guide: CategoryGuideContent,
  item: GuideSelection
): CategoryGuideView {
  return {
    intro: guide.intro,
    imageUrl: guide.imageUrl,
    imageAlt: guide.imageAlt,
    styles: sortGuideEntries(guide.styles, item),
    materials: sortGuideEntries(guide.materials, item),
  };
}

export type CategoryGuideRow = {
  category_code: string;
  intro: string;
  style_guides: unknown[] | null;
  material_guides: unknown[] | null;
};

function mapGuideEntries(
  entries: unknown[] | null,
  defaultAxis: GuideAxis
): CategoryGuideEntry[] {
  return (entries ?? []).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    if (
      typeof value.value !== "string" ||
      typeof value.name !== "string"
    ) {
      return [];
    }
    return [{
      axis: (typeof value.axis === "string" ? value.axis : defaultAxis) as GuideAxis,
      value: value.value,
      label: value.name,
      pros: Array.isArray(value.pros) ? value.pros.filter((item): item is string => typeof item === "string") : [],
      cautions: Array.isArray(value.cautions)
        ? value.cautions.filter((item): item is string => typeof item === "string")
        : [],
      sortOrder: index,
    }];
  });
}

export function mapCategoryGuideRow(row: CategoryGuideRow): CategoryGuideContent {
  return {
    categoryCode: row.category_code,
    intro: row.intro,
    styles: mapGuideEntries(row.style_guides, "fit_type"),
    materials: mapGuideEntries(row.material_guides, "material"),
  };
}

/** Group database guide rows for direct lookup by the checklist category code. */
export function groupCategoryGuidesByCategory(
  guides: CategoryGuideContent[]
): Record<string, CategoryGuideContent> {
  return Object.fromEntries(guides.map((guide) => [guide.categoryCode, guide]));
}

export type GuideVisualAsset = {
  categoryCode: string;
  guideKind: "category" | "style" | "material";
  axis?: GuideAxis;
  value?: string;
  imageUrl: string;
  imageAlt: string;
};

export const CATEGORY_GUIDE_VISUAL_AXIS = "category";
export const CATEGORY_GUIDE_VISUAL_VALUE = "overview";

/** Adds only approved guide imagery while leaving unpublished entries text-only. */
export function attachGuideVisualAssets(
  guides: CategoryGuideContent[],
  assets: GuideVisualAsset[]
): CategoryGuideContent[] {
  const categoryAssets = new Map(
    assets
      .filter((asset) => asset.guideKind === "category")
      .map((asset) => [asset.categoryCode, asset])
  );
  const byKey = new Map(
    assets
      .filter((asset) => asset.guideKind !== "category" && asset.axis && asset.value)
      .map((asset) => [
        `${asset.categoryCode}:${asset.guideKind}:${asset.axis}:${asset.value}`,
        asset,
      ])
  );
  const attach = (categoryCode: string, guideKind: "style" | "material", entry: CategoryGuideEntry) => {
    const asset = byKey.get(`${categoryCode}:${guideKind}:${entry.axis}:${entry.value}`);
    return asset ? { ...entry, imageUrl: asset.imageUrl, imageAlt: asset.imageAlt } : entry;
  };

  return guides.map((guide) => {
    const categoryAsset = categoryAssets.get(guide.categoryCode);
    return {
      ...guide,
      ...(categoryAsset
        ? { imageUrl: categoryAsset.imageUrl, imageAlt: categoryAsset.imageAlt }
        : {}),
      styles: guide.styles.map((entry) => attach(guide.categoryCode, "style", entry)),
      materials: guide.materials.map((entry) => attach(guide.categoryCode, "material", entry)),
    };
  });
}

export type GuideCategoryCode = ClothingCategory;
