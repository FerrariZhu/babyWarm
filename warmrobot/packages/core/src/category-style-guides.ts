/**
 * Editorial style cards under a clothing category (not garment_variants rows).
 * Shown in C-end half-sheet; edited in admin.
 */

export type CategoryStyleGuide = {
  id: string;
  categoryCode: string;
  title: string;
  subtitle?: string | null;
  pros: string;
  cons: string;
  usageTips: string;
  sortOrder: number;
};

export type CategoryStyleGuideRow = {
  id: string;
  category_code: string;
  title: string;
  subtitle: string | null;
  pros: string;
  cons: string;
  usage_tips: string;
  sort_order: number;
  is_active?: boolean;
};

export function mapCategoryStyleGuideRow(
  row: CategoryStyleGuideRow
): CategoryStyleGuide {
  return {
    id: row.id,
    categoryCode: row.category_code,
    title: row.title,
    subtitle: row.subtitle,
    pros: row.pros ?? "",
    cons: row.cons ?? "",
    usageTips: row.usage_tips ?? "",
    sortOrder: row.sort_order,
  };
}

/** Group guides by category_code for checklist half-sheet lookup. */
export function groupStyleGuidesByCategory(
  guides: CategoryStyleGuide[]
): Record<string, CategoryStyleGuide[]> {
  const out: Record<string, CategoryStyleGuide[]> = {};
  for (const g of guides) {
    const list = out[g.categoryCode] ?? [];
    list.push(g);
    out[g.categoryCode] = list;
  }
  for (const code of Object.keys(out)) {
    out[code].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return out;
}
