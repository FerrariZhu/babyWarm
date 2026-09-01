/**
 * C-end variant feature subtitles — no imports from generator / copy modules.
 */
import type { ClothingCategory } from "./types";
import type {
  BodysuitStyle,
  FitType,
  GarmentThickness,
  Material,
  PantLength,
  SockHeight,
  Thickness,
} from "./variant-axis-types";

export type VariantAxisRow = {
  category_code: string;
  material?: string | null;
  fill_type?: string | null;
  thickness?: string | null;
  fit_type?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
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

const THICKNESS_ZH: Record<string, string> = {
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

const CONSUMER_FEATURE: Partial<Record<Material, Record<Thickness, string>>> = {
  cotton: { thin: "轻薄透气", medium: "纯棉日常", thick: "厚棉保暖" },
  modal: { thin: "丝滑亲肤", medium: "莫代尔亲肤", thick: "厚实亲肤" },
  acrylic: { thin: "轻薄弹性", medium: "弹性保暖", thick: "厚实弹性" },
  polyester: { thin: "轻薄速干", medium: "速干日常", thick: "厚实速干" },
  wool: { thin: "轻薄羊毛", medium: "羊毛保暖", thick: "厚实羊毛" },
  fleece: { thin: "轻薄抓绒", medium: "抓绒保暖", thick: "厚实抓绒" },
  down: { thin: "轻薄羽绒", medium: "羽绒保暖", thick: "极寒厚绒" },
};

function toCoreThickness(t: GarmentThickness | null): Thickness | null {
  if (t == null) return null;
  if (t === "standard" || t === "regular_fill") return "medium";
  if (t === "breathable" || t === "lightweight") return "thin";
  if (t === "fleece_lined" || t === "extreme_cold") return "thick";
  return t;
}

/** Feature subtitle from variant axes. */
export function buildVariantSubtitle(params: {
  category: ClothingCategory;
  material: Material | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  bodysuitStyle: BodysuitStyle | null;
  pantLength: PantLength | null;
  sockHeight: SockHeight | null;
}): string | undefined {
  const { material, thickness, fitType, bodysuitStyle, pantLength, sockHeight } = params;
  const coreThick = toCoreThickness(thickness);
  if (!material || !coreThick) return undefined;

  const parts: string[] = [];
  const feature =
    CONSUMER_FEATURE[material]?.[coreThick] ??
    `${MATERIAL_ZH[material]}${THICKNESS_ZH[coreThick]}`;
  parts.push(feature);

  if (fitType === "loose") parts.push("宽松");
  if (fitType === "slim") parts.push("紧身");

  if (bodysuitStyle === "triangle") parts.push("三角款");
  if (bodysuitStyle === "long_leg") parts.push("长裤款");

  if (pantLength === "full_length") parts.push("全长");
  else if (pantLength === "nine_tenth") parts.push("九分");

  if (sockHeight === "over_calf") parts.push("长筒");
  else if (sockHeight === "mid_calf") parts.push("中筒");
  else if (sockHeight === "no_show") parts.push("船袜");
  else if (sockHeight === "ankle") parts.push("短筒");

  return parts.length > 0 ? parts.join("·") : undefined;
}

export function buildVariantSubtitleFromRow(row: VariantAxisRow): string | undefined {
  return buildVariantSubtitle({
    category: row.category_code as ClothingCategory,
    material: (row.material as Material | null) ?? null,
    thickness: (row.thickness as GarmentThickness | null) ?? null,
    fitType: (row.fit_type as FitType | null) ?? null,
    bodysuitStyle: (row.bodysuit_style as BodysuitStyle | null) ?? null,
    pantLength: (row.pant_length as PantLength | null) ?? null,
    sockHeight: (row.sock_height as SockHeight | null) ?? null,
  });
}
