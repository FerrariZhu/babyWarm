/**
 * Admin + C-end helpers for garment variant axis labels and per-category option lists.
 */
import type { ClothingCategory } from "./types";
import {
  CATEGORY_VARIANT_SPECS,
  type VariantAxisSpec,
} from "./category-variant-specs";
import type {
  BodysuitStyle,
  FillType,
  FitType,
  GarmentThickness,
  Material,
  PantLength,
  SockHeight,
  Thickness,
} from "./variant-axis-types";

export type CategoryAxisOptions = {
  materials: Material[] | null;
  fillTypes: FillType[] | null;
  thicknesses: GarmentThickness[];
  fitTypes: FitType[];
  bodysuitStyles: BodysuitStyle[] | null;
  pantLengths: PantLength[] | null;
  sockHeights: SockHeight[] | null;
};

const THICKNESS_ZH: Record<GarmentThickness, string> = {
  thin: "薄",
  medium: "中",
  thick: "厚",
  standard: "标准",
  breathable: "透气",
  fleece_lined: "加绒",
  lightweight: "轻量",
  regular_fill: "常规",
  extreme_cold: "极寒",
};

const FIT_ZH: Record<FitType, string> = {
  slim: "紧身",
  regular: "标准",
  loose: "宽松",
};

const MATERIAL_ZH: Record<Material, string> = {
  cotton: "棉",
  modal: "莫代尔",
  acrylic: "腈纶",
  polyester: "涤纶",
  wool: "羊毛",
  fleece: "摇粒绒",
  down: "羽绒",
};

const FILL_ZH: Record<FillType, string> = {
  cotton_wadding: "棉絮",
  polyester_fill: "聚酯纤维",
};

const BODYSUIT_ZH: Record<BodysuitStyle, string> = {
  triangle: "三角款",
  brief: "平裤款",
  long_leg: "长裤款",
};

const PANT_ZH: Record<PantLength, string> = {
  nine_tenth: "九分",
  full_length: "全长",
};

const SOCK_ZH: Record<SockHeight, string> = {
  no_show: "船袜",
  ankle: "短筒",
  mid_calf: "中筒",
  over_calf: "长筒",
};

function isClothingCategory(code: string): code is ClothingCategory {
  return code in CATEGORY_VARIANT_SPECS;
}

export function thicknessLabelZh(thickness: string | null | undefined): string | null {
  if (!thickness) return null;
  return THICKNESS_ZH[thickness as GarmentThickness] ?? thickness;
}

export function fillTypeLabelZh(fillType: string | null | undefined): string | null {
  if (!fillType) return null;
  return FILL_ZH[fillType as FillType] ?? fillType;
}

export function bodysuitStyleLabelZh(style: string | null | undefined): string | null {
  if (!style) return null;
  return BODYSUIT_ZH[style as BodysuitStyle] ?? style;
}

export function pantLengthLabelZh(length: string | null | undefined): string | null {
  if (!length) return null;
  return PANT_ZH[length as PantLength] ?? length;
}

export function sockHeightLabelZh(height: string | null | undefined): string | null {
  if (!height) return null;
  return SOCK_ZH[height as SockHeight] ?? height;
}

export function materialOptionLabelZh(material: Material): string {
  return MATERIAL_ZH[material] ?? material;
}

export function fitOptionLabelZh(fit: FitType): string {
  return FIT_ZH[fit] ?? fit;
}

export function thicknessOptionLabelZh(thickness: GarmentThickness): string {
  return THICKNESS_ZH[thickness] ?? thickness;
}

const HAT_KIND_ZH: Record<"sun" | "everyday" | "warm", string> = {
  sun: "遮阳帽",
  everyday: "日常帽",
  warm: "保暖帽",
};

export function hatKindLabelZh(kind: string | null | undefined): string | null {
  if (!kind) return null;
  return HAT_KIND_ZH[kind as keyof typeof HAT_KIND_ZH] ?? kind;
}

export function getCategoryAxisSpec(categoryCode: string): VariantAxisSpec | null {
  if (!isClothingCategory(categoryCode)) return null;
  return CATEGORY_VARIANT_SPECS[categoryCode];
}

export function getCategoryAxisOptions(categoryCode: string): CategoryAxisOptions | null {
  const spec = getCategoryAxisSpec(categoryCode);
  if (!spec) return null;
  return {
    materials: spec.materials,
    fillTypes: spec.fillTypes,
    thicknesses: spec.thicknesses,
    fitTypes: spec.fitTypes,
    bodysuitStyles: spec.bodysuitStyles,
    pantLengths: spec.pantLengths,
    sockHeights: spec.sockHeights,
  };
}

/** Summarize allowed materials / fits for admin category header chips. */
export function summarizeCategoryAxisChips(categoryCode: string): {
  materials: string[];
  fits: string[];
} {
  const spec = getCategoryAxisOptions(categoryCode);
  if (!spec) return { materials: [], fits: [] };
  return {
    materials: (spec.materials ?? []).map(materialOptionLabelZh),
    fits: spec.fitTypes.map(fitOptionLabelZh),
  };
}

export {
  MATERIAL_ZH,
  FIT_ZH,
  THICKNESS_ZH,
  FILL_ZH,
  BODYSUIT_ZH,
  PANT_ZH,
  SOCK_ZH,
};
