/**
 * Checklist card chips: show the 1–2 axes a parent actually picks, per category.
 *
 * T恤 → 面料 + 版型
 * 包屁衣 → 面料 + 款式
 * 袜子 → 面料 + 袜筒
 * 长裤 → 面料 + 裤长
 * 遮阳帽 / 防晒衣 → 无（功能性，品类名已够）
 */
import type { AdviceItem } from "./daily-brief-types";
import type { ClothingCategory } from "./types";
import { CATEGORY_VARIANT_SPECS } from "./category-variant-specs";
import {
  BODYSUIT_ZH,
  PANT_ZH,
  SOCK_ZH,
  THICKNESS_ZH,
} from "./variant-axis-labels";
import type {
  BodysuitStyle,
  FitType,
  GarmentThickness,
  PantLength,
  SockHeight,
} from "./variant-axis-types";

export type ChecklistDisplayChip = {
  /** Stable key for React lists / tests. */
  key: "material" | "fit" | "style" | "sock_height" | "pant_length" | "thickness";
  label: string;
  value: string;
};

const MATERIAL_ZH: Record<string, string> = {
  cotton: "纯棉",
  modal: "莫代尔",
  polyester: "速干面料",
  acrylic: "腈纶",
  wool: "羊毛",
  fleece: "抓绒",
  down: "羽绒",
};

const FIT_ZH: Record<FitType, string> = {
  slim: "修身",
  regular: "标准",
  loose: "宽松",
};

/** Categories whose name already encodes the job — extra 面料/版型 chips add noise. */
const FUNCTIONAL_NO_CHIPS = new Set<ClothingCategory>([
  "hat",
  "outer_uv",
  "shoes_sandal",
  "other",
]);

function materialValue(material: string | null | undefined): string | null {
  if (!material) return null;
  return MATERIAL_ZH[material] ?? material;
}

function fitValue(fitType: string | null | undefined): string | null {
  if (!fitType) return null;
  return FIT_ZH[fitType as FitType] ?? fitType;
}

function thicknessValue(thickness: string | null | undefined): string | null {
  if (!thickness) return null;
  return THICKNESS_ZH[thickness as GarmentThickness] ?? thickness;
}

function showMaterial(category: ClothingCategory): boolean {
  const spec = CATEGORY_VARIANT_SPECS[category];
  return Boolean(spec.materials && spec.materials.length > 1);
}

/**
 * Second chip after 面料. Structural axes (款式 / 袜筒 / 裤长) beat 版型.
 * Down jackets use 充绒 instead of 面料 (material is always 羽绒).
 */
function secondaryChip(item: AdviceItem, category: ClothingCategory): ChecklistDisplayChip | null {
  const spec = CATEGORY_VARIANT_SPECS[category];

  if (spec.bodysuitStyles && spec.bodysuitStyles.length > 0) {
    const style = item.bodysuitStyle as BodysuitStyle | null | undefined;
    const value = style ? (BODYSUIT_ZH[style] ?? style) : null;
    if (!value) return null;
    return { key: "style", label: "款式", value };
  }

  if (spec.sockHeights && spec.sockHeights.length > 0) {
    const height = item.sockHeight as SockHeight | null | undefined;
    const value = height ? (SOCK_ZH[height] ?? height) : null;
    if (!value) return null;
    return { key: "sock_height", label: "袜筒", value };
  }

  if (spec.pantLengths && spec.pantLengths.length > 0) {
    const length = item.pantLength as PantLength | null | undefined;
    const value = length ? (PANT_ZH[length] ?? length) : null;
    if (!value) return null;
    return { key: "pant_length", label: "裤长", value };
  }

  if (category.startsWith("shoes_")) {
    const value = thicknessValue(item.thickness);
    if (!value) return null;
    return { key: "thickness", label: "款式", value };
  }

  if (category === "outer_down") {
    const fill = thicknessValue(item.thickness);
    if (!fill) return null;
    return { key: "thickness", label: "充绒", value: fill };
  }

  if (spec.fitTypes.length > 1) {
    const value = fitValue(item.fitType ?? "regular");
    if (!value) return null;
    return { key: "fit", label: "版型", value };
  }

  return null;
}

export function checklistDisplayChips(item: AdviceItem): ChecklistDisplayChip[] {
  if (item.kind !== "category" || !item.category) return [];
  const category = item.category;
  if (FUNCTIONAL_NO_CHIPS.has(category)) return [];

  const chips: ChecklistDisplayChip[] = [];

  if (showMaterial(category)) {
    const value = materialValue(item.material);
    if (value) chips.push({ key: "material", label: "面料", value });
  }

  if (category === "outer_down") {
    const fill = secondaryChip(item, category);
    if (fill) chips.push(fill);
    if (CATEGORY_VARIANT_SPECS.outer_down.fitTypes.length > 1) {
      const fit = fitValue(item.fitType ?? "regular");
      if (fit) chips.push({ key: "fit", label: "版型", value: fit });
    }
    return chips;
  }

  const second = secondaryChip(item, category);
  if (second) chips.push(second);
  return chips;
}
