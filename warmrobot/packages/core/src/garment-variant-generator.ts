/**
 * Garment variant generator — enumerates all valid attribute combinations per
 * clothing category per docs/specs/garment-variants.md §2.
 *
 * Produces seed rows for `public.garment_variants`. The generator is the single
 * source of truth for warmth_value formulas and admin_label / consumer_label
 * seeds; the migration uses these constants directly.
 *
 * Specification: docs/specs/garment-variants.md
 */
import type { ClothingCategory } from "./types";
import { CATEGORY_DISPLAY_LABELS_EN } from "./daily-brief-types";
import type {
  BodysuitStyle,
  DownFillLevel,
  FillType,
  FitType,
  GarmentThickness,
  HatKind,
  Material,
  PantLength,
  ShoeThickness,
  SockHeight,
  Thickness,
} from "./variant-axis-types";
import {
  CATEGORY_VARIANT_SPECS,
  type VariantAxisSpec,
} from "./category-variant-specs";

export type { VariantAxisSpec } from "./category-variant-specs";
export type {
  BodysuitStyle,
  DownFillLevel,
  FillType,
  FitType,
  GarmentThickness,
  HatKind,
  Material,
  PantLength,
  ShoeThickness,
  SockHeight,
  Thickness,
} from "./variant-axis-types";
export { CATEGORY_VARIANT_SPECS } from "./category-variant-specs";

// ---------------------------------------------------------------------------
// Warmth value formula (spec §3)
// ---------------------------------------------------------------------------

const CATEGORY_BASE_WARMTH: Record<ClothingCategory, number> = {
  bodysuit_short: 15,
  bodysuit_long: 42,
  tshirt_short: 15,
  tshirt_long: 42,
  thermal_top: 70,
  sweater: 70,
  fleece_top: 74,
  vest: 55,
  vest_down: 62,
  outer_uv: 15,
  outer_shell: 50,
  outer_cotton: 75,
  outer_down: 88,
  long_johns: 70,
  pants_short: 25,
  pants_mid: 40,
  pants_long: 55,
  shoes_sandal: 10,
  shoes_sneaker: 45,
  shoes_leather: 50,
  shoes_boot: 80,
  hat: 35,
  scarf: 88,
  gloves: 78,
  socks: 35,
  other: 50,
};

const MATERIAL_ADJ: Record<Material, number> = {
  cotton: 0,
  modal: -2,
  acrylic: 2,
  polyester: -4,
  wool: 8,
  fleece: 6,
  down: 18,
};

const THICKNESS_ADJ: Record<Thickness, number> = {
  thin: -12,
  medium: 0,
  thick: 12,
};

const FIT_ADJ: Record<FitType, number> = {
  slim: -6,
  regular: 0,
  loose: 8,
};

const FILL_ADJ: Record<FillType, number> = {
  cotton_wadding: 0,
  polyester_fill: 4,
};

function pantLengthAdj(pl: PantLength | null): number {
  if (pl === "full_length") return 4;
  return 0;
}

function toCoreThickness(t: GarmentThickness | null): Thickness | null {
  if (t == null) return null;
  if (t === "standard" || t === "regular_fill") return "medium";
  if (t === "breathable" || t === "lightweight") return "thin";
  if (t === "fleece_lined" || t === "extreme_cold") return "thick";
  return t;
}

function sockHeightAdj(sh: SockHeight | null): number {
  if (sh === "over_calf") return 6;
  if (sh === "mid_calf") return 3;
  if (sh === "no_show") return -2;
  return 0;
}

function bodysuitStyleAdj(bs: BodysuitStyle | null): number {
  return bs === "long_leg" ? 4 : 0;
}

export function hatKindWarmth(kind: HatKind): number {
  if (kind === "sun") return 23;
  if (kind === "warm") return 47;
  return 35;
}

export function calcVariantWarmthValue(params: {
  category: ClothingCategory;
  material: Material | null;
  fillType: FillType | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  bodysuitStyle: BodysuitStyle | null;
  pantLength: PantLength | null;
  sockHeight: SockHeight | null;
  hatKind?: HatKind | null;
}): number {
  if (params.hatKind) return hatKindWarmth(params.hatKind);

  const {
    category,
    material,
    fillType,
    fitType,
    bodysuitStyle,
    pantLength,
    sockHeight,
  } = params;
  const thickness = toCoreThickness(params.thickness);
  let score = CATEGORY_BASE_WARMTH[category];
  if (material) score += MATERIAL_ADJ[material];
  if (thickness) score += THICKNESS_ADJ[thickness];
  if (fitType) score += FIT_ADJ[fitType];
  if (fillType) score += FILL_ADJ[fillType];
  score += pantLengthAdj(pantLength);
  score += sockHeightAdj(sockHeight);
  score += bodysuitStyleAdj(bodysuitStyle);
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Label generators (spec §4)
// ---------------------------------------------------------------------------

const CATEGORY_SHORT_NAME: Record<ClothingCategory, string> = {
  bodysuit_short: "包屁衣",
  bodysuit_long: "长袖包屁衣",
  tshirt_short: "T恤",
  tshirt_long: "长袖T恤",
  thermal_top: "秋衣",
  sweater: "毛衣",
  fleece_top: "卫衣",
  vest: "马甲",
  vest_down: "羽绒马甲",
  outer_uv: "防晒衣",
  outer_shell: "外套",
  outer_cotton: "棉衣",
  outer_down: "羽绒服",
  long_johns: "秋裤",
  pants_short: "短裤",
  pants_mid: "中裤",
  pants_long: "长裤",
  shoes_sandal: "凉鞋",
  shoes_sneaker: "运动鞋",
  shoes_leather: "皮鞋",
  shoes_boot: "高帮靴",
  hat: "帽子",
  scarf: "围巾",
  gloves: "手套",
  socks: "袜子",
  other: "其他",
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

const FIT_ZH: Record<FitType, string> = {
  slim: "紧身",
  regular: "标准",
  loose: "宽松",
};

const BODYSUIT_STYLE_ZH: Record<BodysuitStyle, string> = {
  triangle: "三角款",
  brief: "平裤款",
  long_leg: "长裤款",
};

const PANT_LENGTH_ZH: Record<PantLength, string> = {
  nine_tenth: "九分",
  full_length: "全长",
};

const SOCK_HEIGHT_ZH: Record<SockHeight, string> = {
  no_show: "船袜",
  ankle: "短筒",
  mid_calf: "中筒",
  over_calf: "长筒",
};

const FILL_TYPE_ZH: Record<FillType, string> = {
  cotton_wadding: "棉絮",
  polyester_fill: "聚酯纤维",
};


const WINTER_HAT_MATERIALS = new Set(["fleece", "wool", "down"]);

export const HAT_KIND_LABELS: Record<HatKind, { zh: string; en: string }> = {
  sun: { zh: "遮阳帽", en: "Sun Hat" },
  everyday: { zh: "帽子", en: "Hat" },
  warm: { zh: "保暖帽", en: "Warm Hat" },
};

/** Legacy fallback when `hat_kind` column is absent. */
export function hatKindFromAttrs(
  material?: string | null,
  thickness?: string | null,
  hatKind?: string | null
): HatKind {
  if (hatKind === "sun" || hatKind === "everyday" || hatKind === "warm") return hatKind;
  if (material && WINTER_HAT_MATERIALS.has(material)) return "warm";
  if (thickness === "thick" || thickness === "extreme_cold") return "warm";
  if (thickness === "thin" || thickness === "lightweight") return "sun";
  return "everyday";
}

function categoryShortName(
  category: ClothingCategory,
  material: string | null,
  thickness: string | null,
  hatKind?: HatKind | null
): string {
  if (category === "hat" && hatKind) return HAT_KIND_LABELS[hatKind].zh;
  if (category === "hat") return HAT_KIND_LABELS[hatKindFromAttrs(material, thickness)].zh;
  return CATEGORY_SHORT_NAME[category];
}

/** B-end admin identity label — code-based, generated, read-only. */
export function buildAdminLabel(params: {
  category: ClothingCategory;
  material: Material | null;
  fillType: FillType | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  bodysuitStyle: BodysuitStyle | null;
  pantLength: PantLength | null;
  sockHeight: SockHeight | null;
  hatKind?: HatKind | null;
}): string {
  const {
    category,
    material,
    fillType,
    thickness,
    fitType,
    bodysuitStyle,
    pantLength,
    sockHeight,
    hatKind,
  } = params;
  if (category === "hat" && hatKind) return HAT_KIND_LABELS[hatKind].zh;
  if (category === "shoes_sneaker" && thickness) {
    return `运动鞋-${THICKNESS_ZH[thickness] ?? thickness}`;
  }
  if (category === "shoes_leather" && thickness) {
    return `皮鞋-${THICKNESS_ZH[thickness] ?? thickness}`;
  }
  if (category === "shoes_boot" && thickness) {
    return `高帮靴-${THICKNESS_ZH[thickness] ?? thickness}`;
  }
  if (category === "outer_down" && thickness) {
    const fitLabel = fitType === "loose" ? "-宽松" : "";
    return `羽绒服-${THICKNESS_ZH[thickness] ?? thickness}${fitLabel}`;
  }
  const parts = [categoryShortName(category, material, thickness, hatKind)];
  if (material) parts.push(MATERIAL_ZH[material]);
  if (fillType) parts.push(FILL_TYPE_ZH[fillType]);
  const coreThick = thickness ? THICKNESS_ZH[thickness] : null;
  if (coreThick && ["thin", "medium", "thick"].includes(toCoreThickness(thickness)!)) {
    parts.push(coreThick);
  } else if (coreThick && thickness && !["standard", "breathable", "fleece_lined"].includes(thickness)) {
    parts.push(coreThick);
  }
  if (fitType && fitType !== "regular") parts.push(FIT_ZH[fitType]);
  if (bodysuitStyle) parts.push(BODYSUIT_STYLE_ZH[bodysuitStyle]);
  if (pantLength) parts.push(PANT_LENGTH_ZH[pantLength]);
  if (sockHeight) parts.push(SOCK_HEIGHT_ZH[sockHeight]);
  return parts.join("-");
}

export { buildVariantSubtitle } from "./variant-subtitle";

export function buildConsumerLabel(params: {
  category: ClothingCategory;
  material: Material | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  bodysuitStyle: BodysuitStyle | null;
  pantLength: PantLength | null;
  sockHeight: SockHeight | null;
  hatKind?: HatKind | null;
}): string {
  const { category, material, thickness, hatKind } = params;
  return categoryShortName(category, material, thickness, hatKind);
}

export function buildConsumerLabelEn(params: {
  category: ClothingCategory;
  hatKind?: HatKind | null;
}): string {
  const { category, hatKind } = params;
  if (category === "hat" && hatKind) return HAT_KIND_LABELS[hatKind].en;
  return CATEGORY_DISPLAY_LABELS_EN[category];
}

/** C-end consumer tags (keyword chips). */
export function buildConsumerTags(params: {
  material: Material | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  sockHeight: SockHeight | null;
  pantLength: PantLength | null;
  hatKind?: HatKind | null;
}): string[] {
  const { material, thickness, fitType, sockHeight, pantLength, hatKind } = params;
  const tags: string[] = [];
  const coreThick = toCoreThickness(thickness);
  if (coreThick === "thin") tags.push("轻薄");
  if (coreThick === "thick") tags.push("厚实");
  if (thickness === "breathable") tags.push("透气");
  if (thickness === "fleece_lined") tags.push("加绒");
  if (material === "polyester") tags.push("速干");
  if (material === "cotton") tags.push("透气");
  if (material === "wool") tags.push("保暖");
  if (material === "down") tags.push("防风");
  if (material === "fleece") tags.push("抓绒");
  if (fitType === "loose") tags.push("宽松");
  if (fitType === "slim") tags.push("紧身");
  if (sockHeight === "over_calf") tags.push("长筒");
  if (sockHeight === "no_show") tags.push("船袜");
  if (pantLength === "full_length") tags.push("全长");
  if (hatKind === "sun" && !tags.includes("防晒")) tags.push("防晒");
  return tags;
}

// ---------------------------------------------------------------------------
// Variant row type
// ---------------------------------------------------------------------------

export type GarmentVariantSeedRow = {
  category_code: ClothingCategory;
  material: Material | null;
  fill_type: FillType | null;
  thickness: GarmentThickness | null;
  fit_type: FitType | null;
  bodysuit_style: BodysuitStyle | null;
  pant_length: PantLength | null;
  sock_height: SockHeight | null;
  hat_kind: HatKind | null;
  warmth_value: number;
  admin_label: string;
  consumer_label: string;
  consumer_label_en: string;
  consumer_tags: string[];
  pros: string;
  cons: string;
  usage_tips: string;
  is_active: boolean;
  sort_order: number;
};

const CLOTHING_CATEGORIES: ClothingCategory[] = [
  "bodysuit_short",
  "bodysuit_long",
  "tshirt_short",
  "tshirt_long",
  "thermal_top",
  "sweater",
  "fleece_top",
  "vest",
  "vest_down",
  "outer_uv",
  "outer_shell",
  "outer_cotton",
  "outer_down",
  "long_johns",
  "pants_short",
  "pants_mid",
  "pants_long",
  "shoes_sandal",
  "shoes_sneaker",
  "shoes_leather",
  "shoes_boot",
  "hat",
  "scarf",
  "gloves",
  "socks",
  "other",
];

/**
 * Generates all valid garment variant seed rows.
 * No database access — pure computation for use in migration seeds and tests.
 */
export function generateGarmentVariants(): GarmentVariantSeedRow[] {
  const rows: GarmentVariantSeedRow[] = [];

  for (const code of CLOTHING_CATEGORIES) {
    const spec = CATEGORY_VARIANT_SPECS[code];

    if (code === "other") {
      rows.push(makeRow(code, null, null, null, "regular", null, null, null, null, rows.length));
      continue;
    }

    if (spec.hatKinds) {
      for (const hatKind of spec.hatKinds) {
        rows.push(makeRow(code, null, null, null, "regular", null, null, null, hatKind, rows.length));
      }
      continue;
    }

    if (spec.materials === null && spec.thicknesses.length === 0) {
      rows.push(makeRow(code, null, null, null, "regular", null, null, null, null, rows.length));
      continue;
    }

    const materials: Array<Material | null> = spec.materials ?? [null];
    const thicknesses: Array<GarmentThickness | null> = spec.thicknesses.length
      ? spec.thicknesses
      : [null];
    const fitTypes = spec.fitTypes;
    const bodysuitStyles: Array<BodysuitStyle | null> = spec.bodysuitStyles ?? [null];
    const pantLengths: Array<PantLength | null> = spec.pantLengths ?? [null];
    const sockHeights: Array<SockHeight | null> = spec.sockHeights ?? [null];

    for (const mat of materials) {
      for (const thick of thicknesses) {
        for (const fit of fitTypes) {
          for (const bs of bodysuitStyles) {
            for (const pl of pantLengths) {
              for (const sh of sockHeights) {
                rows.push(
                  makeRow(code, mat, null, thick, fit, bs, pl, sh, null, rows.length)
                );
              }
            }
          }
        }
      }
    }
  }

  return rows;
}

type BuildVariantCopyFn = typeof import("./variant-copy").buildVariantCopy;

let buildVariantCopyCached: BuildVariantCopyFn | undefined;

function resolveBuildVariantCopy(): BuildVariantCopyFn {
  if (buildVariantCopyCached) return buildVariantCopyCached;
  // Lazy load breaks generator ↔ copy init cycle in webpack/transpilePackages.
  const loaded = require("./variant-copy").buildVariantCopy as BuildVariantCopyFn;
  buildVariantCopyCached = loaded;
  return loaded;
}

function makeRow(
  code: ClothingCategory,
  material: Material | null,
  fillType: FillType | null,
  thickness: GarmentThickness | null,
  fitType: FitType | null,
  bodysuitStyle: BodysuitStyle | null,
  pantLength: PantLength | null,
  sockHeight: SockHeight | null,
  hatKind: HatKind | null,
  idx: number
): GarmentVariantSeedRow {
  const warmth_value = calcVariantWarmthValue({
    category: code,
    material,
    fillType,
    thickness,
    fitType,
    bodysuitStyle,
    pantLength,
    sockHeight,
    hatKind,
  });

  const labelParams = {
    category: code,
    material,
    fillType,
    thickness,
    fitType,
    bodysuitStyle,
    pantLength,
    sockHeight,
    hatKind,
  };

  return {
    category_code: code,
    material,
    fill_type: fillType,
    thickness,
    fit_type: fitType,
    bodysuit_style: bodysuitStyle,
    pant_length: pantLength,
    sock_height: sockHeight,
    hat_kind: hatKind,
    warmth_value,
    admin_label: buildAdminLabel(labelParams),
    consumer_label: buildConsumerLabel(labelParams),
    consumer_label_en: buildConsumerLabelEn(labelParams),
    consumer_tags: buildConsumerTags({
      material,
      thickness,
      fitType,
      sockHeight,
      pantLength,
      hatKind,
    }),
    ...(() => {
      const copy = resolveBuildVariantCopy()({
        category: code,
        material,
        fillType,
        thickness,
        fitType,
        bodysuitStyle,
        pantLength,
        sockHeight,
        hatKind,
      });
      return { pros: copy.pros, cons: copy.cons, usage_tips: copy.usageTips };
    })(),
    is_active: code !== "other",
    sort_order: idx,
  };
}

/** Select the single best variant for a slot given requiredWarmth. */
export function pickVariantForSlot(
  variants: Pick<GarmentVariantSeedRow, "warmth_value" | "sort_order" | "admin_label">[],
  requiredWarmth: number
): typeof variants[number] | null {
  if (variants.length === 0) return null;
  return variants.reduce((best, v) => {
    const dv = Math.abs(v.warmth_value - requiredWarmth);
    const db = Math.abs(best.warmth_value - requiredWarmth);
    if (dv < db) return v;
    if (dv === db) return v.sort_order < best.sort_order ? v : best;
    return best;
  });
}
