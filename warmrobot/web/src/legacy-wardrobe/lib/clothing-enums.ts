import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import type { ClothingFitType } from "@/lib/clothing-weight";
import { normalizeCategoryCode } from "@/lib/clothing-categories";
import {
  SIZE_HEIGHT_CODES,
  SIZE_LETTER_CODES,
  splitSizeCodes,
} from "@/lib/size-standards";

export {
  isLetterSizeCode,
  LETTER_TO_HEIGHT,
  resolveSizeForWeight,
  SIZE_HEIGHT_CODES,
  SIZE_LETTER_CODES,
  splitSizeCodes,
} from "@/lib/size-standards";

/** 面料 code — 与 materials 表 / fabric_material enum 对齐 */
export type MaterialCode =
  | "cotton"
  | "modal"
  | "fleece"
  | "acrylic"
  | "polyester"
  | "wool"
  | "down"
  | "unspecified";

export type FillType = "cotton_wadding" | "polyester_fill";
export type BodysuitStyle = "triangle" | "brief" | "long_leg";
export type PantLength = "seven_tenth" | "nine_tenth" | "full_length";
export type SockHeight = "ankle" | "mid_calf" | "over_calf";

export const MATERIAL_CODES: MaterialCode[] = [
  "cotton",
  "modal",
  "fleece",
  "acrylic",
  "polyester",
  "wool",
  "down",
];

export const MATERIAL_LABELS: Record<MaterialCode, string> = {
  cotton: "棉",
  modal: "莫代尔",
  fleece: "摇粒绒",
  acrylic: "腈纶",
  polyester: "涤纶",
  wool: "羊毛",
  down: "羽绒",
  unspecified: "未指定",
};

export const FILL_TYPE_OPTIONS: { value: FillType; label: string }[] = [
  { value: "cotton_wadding", label: "棉絮" },
  { value: "polyester_fill", label: "聚酯纤维" },
];

export const BODYSUIT_STYLE_OPTIONS: { value: BodysuitStyle; label: string }[] = [
  { value: "triangle", label: "三角款" },
  { value: "brief", label: "平裤款" },
  { value: "long_leg", label: "长裤款" },
];

export const PANT_LENGTH_OPTIONS: { value: PantLength; label: string }[] = [
  { value: "seven_tenth", label: "七分" },
  { value: "nine_tenth", label: "九分" },
  { value: "full_length", label: "全长" },
];

export const SOCK_HEIGHT_OPTIONS: { value: SockHeight; label: string }[] = [
  { value: "ankle", label: "短筒" },
  { value: "mid_calf", label: "中筒" },
  { value: "over_calf", label: "长筒" },
];

const H48_130 = ["48", "52", "59", "66", "73", "80", "90", "100", "110", "120", "130"] as const;
const H73_165 = ["73", "80", "90", "100", "110", "120", "130", "140", "150", "160", "165"] as const;
const H66_165 = ["66", "73", "80", "90", "100", "110", "120", "130", "140", "150", "160", "165"] as const;
const LETTERS = SIZE_LETTER_CODES;
const ALL_HEIGHT = SIZE_HEIGHT_CODES;
const ALL_SIZES = [...ALL_HEIGHT, ...LETTERS] as const;

const M_COTTON_MODAL_ACRYLIC_POLY: MaterialCode[] = ["cotton", "modal", "acrylic", "polyester"];
const M_COTTON_ACRYLIC_POLY_WOOL: MaterialCode[] = ["cotton", "acrylic", "polyester", "wool"];
const M_COTTON_FLEECE_ACRYLIC_POLY: MaterialCode[] = ["cotton", "fleece", "acrylic", "polyester"];
const M_COTTON_FLEECE_ACRYLIC_POLY_WOOL: MaterialCode[] = [
  "cotton",
  "fleece",
  "acrylic",
  "polyester",
  "wool",
];
const M_COTTON_FLEECE_ACRYLIC_POLY_WOOL_DOWN: MaterialCode[] = [
  "cotton",
  "fleece",
  "acrylic",
  "polyester",
  "wool",
  "down",
];
const M_COTTON_MODAL_ACRYLIC_POLY_WOOL: MaterialCode[] = [
  "cotton",
  "modal",
  "acrylic",
  "polyester",
  "wool",
];
const M_COTTON_POLY: MaterialCode[] = ["cotton", "polyester"];
const M_COTTON_ACRYLIC_POLY: MaterialCode[] = ["cotton", "acrylic", "polyester"];
const M_COTTON_MODAL_ACRYLIC_POLY_FLEECE: MaterialCode[] = [
  "cotton",
  "modal",
  "acrylic",
  "polyester",
  "fleece",
];
const M_DOWN: MaterialCode[] = ["down"];

export const SHOE_CATEGORIES: ClothingCategory[] = [
  "shoes_sandal",
  "shoes_sneaker",
  "shoes_leather",
  "shoes_boot",
];

export function getSizeFieldHint(category: string): string | null {
  const normalized = normalizeCategoryCode(category);
  if (!normalized) return null;
  const { sizeCodes, showSize } = CATEGORY_FIELD_CONFIG[normalized];
  if (!showSize || sizeCodes.length === 0) return null;
  const { height, letter } = splitSizeCodes(sizeCodes);

  if (letter.length === 0) {
    return `此类别可选身高码 ${height[0]}–${height[height.length - 1]}（共 ${height.length} 项）`;
  }

  if (normalized === "sweater") {
    return `身高码 ${height.length} 项 · 字母码 ${letter.length} 项；66–100 仅身高，≥110 可字母，二选一录入`;
  }
  if (normalized === "vest") {
    return `身高码 ${height.length} 项 · 字母码 ${letter.length} 项，二选一录入（字母标少见）`;
  }
  return `身高码 ${height.length} 项 · 字母码 ${letter.length} 项，二选一录入`;
}

export interface CategoryFieldConfig {
  showMaterial: boolean;
  showThickness: boolean;
  defaultThickness: ThicknessLevel;
  showSize: boolean;
  showFit: boolean;
  fitOptions: ClothingFitType[];
  defaultFit: ClothingFitType;
  showBodysuitStyle: boolean;
  bodysuitStyleOptions: BodysuitStyle[];
  showFillType: boolean;
  showPantLength: boolean;
  pantLengthOptions: PantLength[];
  defaultPantLength: PantLength | null;
  showSockHeight: boolean;
  materialCodes: MaterialCode[];
  sizeCodes: readonly string[];
  participatesInWarmth: boolean;
}

const DEFAULT_CONFIG: CategoryFieldConfig = {
  showMaterial: true,
  showThickness: true,
  defaultThickness: "medium",
  showSize: true,
  showFit: true,
  fitOptions: ["slim", "regular", "loose"],
  defaultFit: "regular",
  showBodysuitStyle: false,
  bodysuitStyleOptions: [],
  showFillType: false,
  showPantLength: false,
  pantLengthOptions: [],
  defaultPantLength: null,
  showSockHeight: false,
  materialCodes: [...MATERIAL_CODES],
  sizeCodes: ALL_SIZES,
  participatesInWarmth: true,
};

/** 未选类别时：不展示材质/尺码等依赖类别的字段 */
const NO_CATEGORY_CONFIG: CategoryFieldConfig = {
  ...DEFAULT_CONFIG,
  showMaterial: false,
  showThickness: false,
  showSize: false,
  showFit: false,
  showBodysuitStyle: false,
  showFillType: false,
  showPantLength: false,
  showSockHeight: false,
  participatesInWarmth: false,
  materialCodes: [],
  sizeCodes: [],
};

function mergeCategoryFieldConfig(partial: Partial<CategoryFieldConfig>): CategoryFieldConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}

const H_PLUS_LETTER = [...H73_165, ...LETTERS];
const H_PLUS_LETTER_66 = [...H66_165, ...LETTERS];

export const CATEGORY_FIELD_CONFIG: Record<ClothingCategory, CategoryFieldConfig> = {
  bodysuit_short: mergeCategoryFieldConfig({
    showBodysuitStyle: true,
    bodysuitStyleOptions: ["triangle", "brief", "long_leg"],
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    showFit: false,
    sizeCodes: H48_130,
  }),
  bodysuit_long: mergeCategoryFieldConfig({
    showBodysuitStyle: true,
    bodysuitStyleOptions: ["triangle", "long_leg"],
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    showFit: false,
    sizeCodes: H48_130,
  }),
  tshirt_short: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  tshirt_long: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  thermal_top: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY_WOOL,
    fitOptions: ["slim", "regular"],
    sizeCodes: H_PLUS_LETTER,
  }),
  sweater: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_ACRYLIC_POLY_WOOL,
    sizeCodes: H_PLUS_LETTER_66,
  }),
  fleece_top: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  vest: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY_WOOL_DOWN,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  outer_uv: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_ACRYLIC_POLY,
    defaultThickness: "thin",
    showFit: false,
    sizeCodes: H_PLUS_LETTER,
  }),
  outer_shell: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY_WOOL,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  outer_cotton: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_POLY,
    showFillType: true,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  outer_down: mergeCategoryFieldConfig({
    materialCodes: M_DOWN,
    fitOptions: ["regular", "loose"],
    sizeCodes: H_PLUS_LETTER,
  }),
  long_johns: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY_WOOL,
    fitOptions: ["slim", "regular"],
    sizeCodes: H_PLUS_LETTER,
  }),
  pants_short: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    defaultThickness: "thin",
    showFit: false,
    sizeCodes: H_PLUS_LETTER_66,
  }),
  pants_mid: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY,
    fitOptions: ["regular", "loose"],
    defaultPantLength: "seven_tenth",
    sizeCodes: H_PLUS_LETTER,
  }),
  pants_long: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY_FLEECE,
    fitOptions: ["regular", "loose"],
    showPantLength: true,
    pantLengthOptions: ["nine_tenth", "full_length"],
    sizeCodes: H_PLUS_LETTER_66,
  }),
  shoes_sandal: mergeCategoryFieldConfig({
    showMaterial: false,
    showThickness: false,
    showSize: false,
    showFit: false,
    participatesInWarmth: false,
    materialCodes: ["unspecified"],
  }),
  shoes_sneaker: mergeCategoryFieldConfig({
    showMaterial: false,
    showThickness: false,
    showSize: false,
    showFit: false,
    participatesInWarmth: false,
    materialCodes: ["unspecified"],
  }),
  shoes_leather: mergeCategoryFieldConfig({
    showMaterial: false,
    showThickness: false,
    showSize: false,
    showFit: false,
    participatesInWarmth: false,
    materialCodes: ["unspecified"],
  }),
  shoes_boot: mergeCategoryFieldConfig({
    showMaterial: false,
    showThickness: false,
    showSize: false,
    showFit: false,
    participatesInWarmth: false,
    materialCodes: ["unspecified"],
  }),
  hat: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY_WOOL,
    showFit: false,
    showSize: false,
  }),
  scarf: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY_WOOL,
    showFit: false,
    showSize: false,
  }),
  gloves: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_FLEECE_ACRYLIC_POLY_WOOL,
    showFit: false,
    showSize: false,
  }),
  socks: mergeCategoryFieldConfig({
    materialCodes: M_COTTON_MODAL_ACRYLIC_POLY_WOOL,
    showFit: false,
    showSize: false,
    showSockHeight: true,
  }),
  other: mergeCategoryFieldConfig({
    materialCodes: MATERIAL_CODES,
    sizeCodes: ALL_SIZES,
  }),
};

export function getCategoryFieldConfig(category: string): CategoryFieldConfig {
  const normalized = normalizeCategoryCode(category);
  if (!normalized) return NO_CATEGORY_CONFIG;
  return CATEGORY_FIELD_CONFIG[normalized];
}

export function getSizesForCategory(category: string): readonly string[] {
  return getCategoryFieldConfig(category).sizeCodes;
}

export function isShoeCategory(category: string): boolean {
  return SHOE_CATEGORIES.includes(category as ClothingCategory);
}

export function filterMaterialsForCategory<
  T extends { id: string; code: string; name: string },
>(materials: T[], category: string): T[] {
  const normalized = normalizeCategoryCode(category);
  if (!normalized) return [];
  const { materialCodes, showMaterial } = CATEGORY_FIELD_CONFIG[normalized];
  if (!showMaterial) {
    return materials.filter((m) => m.code === "unspecified");
  }
  const allowed = new Set(materialCodes);
  return materials.filter((m) => allowed.has(m.code as MaterialCode));
}

export function filterSizesForCategory<
  T extends { code: string; label: string },
>(sizes: T[], category: string): T[] {
  const normalized = normalizeCategoryCode(category);
  if (!normalized) return [];
  const { sizeCodes, showSize } = CATEGORY_FIELD_CONFIG[normalized];
  if (!showSize) return [];
  const byCode = new Map(sizes.map((s) => [s.code, s]));
  return sizeCodes
    .map((code) => byCode.get(code))
    .filter((s): s is T => s != null);
}

export function filterThicknessesForCategory<
  T extends { code: string; label: string },
>(thicknesses: T[], category: string): T[] {
  const { showThickness } = getCategoryFieldConfig(category);
  if (!showThickness) return [];
  return thicknesses;
}

export function isFillType(value: string): value is FillType {
  return FILL_TYPE_OPTIONS.some((o) => o.value === value);
}

export function isBodysuitStyle(value: string): value is BodysuitStyle {
  return BODYSUIT_STYLE_OPTIONS.some((o) => o.value === value);
}

export function isPantLength(value: string): value is PantLength {
  return PANT_LENGTH_OPTIONS.some((o) => o.value === value);
}

export function isSockHeight(value: string): value is SockHeight {
  return SOCK_HEIGHT_OPTIONS.some((o) => o.value === value);
}

export function getBodysuitStyleOptions(category: string): typeof BODYSUIT_STYLE_OPTIONS {
  const { bodysuitStyleOptions } = getCategoryFieldConfig(category);
  return BODYSUIT_STYLE_OPTIONS.filter((o) => bodysuitStyleOptions.includes(o.value));
}

export function getPantLengthOptions(category: string): typeof PANT_LENGTH_OPTIONS {
  const { pantLengthOptions } = getCategoryFieldConfig(category);
  return PANT_LENGTH_OPTIONS.filter((o) => pantLengthOptions.includes(o.value));
}

export function getFitOptionsForCategory(
  category: string
): { value: ClothingFitType; label: string }[] {
  const { fitOptions, showFit } = getCategoryFieldConfig(category);
  if (!showFit) return [];
  const labels: Record<ClothingFitType, string> = {
    slim: "紧身",
    regular: "标准",
    loose: "宽松",
  };
  return fitOptions.map((value) => ({ value, label: labels[value] }));
}
