/**
 * Browser-safe exports for admin `"use client"` components.
 * Avoids pulling category-advice / generator / weather into the client bundle.
 */
export { CATEGORY_DISPLAY_LABELS_EN } from "./daily-brief-types";
export type { ClothingCategory } from "./types";
export {
  bodysuitStyleLabelZh,
  fillTypeLabelZh,
  fitOptionLabelZh,
  getCategoryAxisOptions,
  getCategoryAxisSpec,
  hatKindLabelZh,
  materialOptionLabelZh,
  pantLengthLabelZh,
  sockHeightLabelZh,
  summarizeCategoryAxisChips,
  thicknessOptionLabelZh,
} from "./variant-axis-labels";
