import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import { getSizeWeightScale, resolveSizeForWeight } from "@/lib/size-standards";

export type ClothingFitType = "slim" | "regular" | "loose";

export const FIT_TYPE_OPTIONS: { value: ClothingFitType; label: string }[] = [
  { value: "slim", label: "紧身" },
  { value: "regular", label: "标准" },
  { value: "loose", label: "宽松" },
];

const CATEGORY_BASE_WEIGHT: Record<ClothingCategory, number> = {
  bodysuit_short: 80,
  bodysuit_long: 120,
  tshirt_short: 70,
  tshirt_long: 90,
  thermal_top: 85,
  sweater: 150,
  fleece_top: 140,
  vest: 90,
  vest_down: 130,
  outer_uv: 120,
  outer_shell: 180,
  outer_down: 200,
  outer_cotton: 220,
  long_johns: 80,
  pants_long: 90,
  pants_short: 60,
  pants_mid: 75,
  shoes_sandal: 80,
  shoes_sneaker: 200,
  shoes_leather: 180,
  shoes_boot: 250,
  hat: 30,
  socks: 25,
  gloves: 20,
  scarf: 40,
  other: 120,
};

const MATERIAL_DENSITY: Record<string, number> = {
  cotton: 1.0,
  modal: 0.95,
  fleece: 1.1,
  acrylic: 1.05,
  polyester: 1.0,
  wool: 1.2,
  down: 0.85,
  unspecified: 0.5,
};

const THICKNESS_WEIGHT: Record<ThicknessLevel, number> = {
  thin: 0.85,
  medium: 1.0,
  thick: 1.25,
};

const FIT_WEIGHT: Record<ClothingFitType, number> = {
  slim: 0.9,
  regular: 1.0,
  loose: 1.15,
};

export function estimateClothingWeightGrams(input: {
  category: string;
  materialCode: string;
  thickness: string;
  sizeLabel: string;
  fitType?: ClothingFitType;
}): number | null {
  const { category, materialCode, thickness, sizeLabel, fitType = "regular" } = input;
  if (!category || !materialCode || !thickness) return null;

  const base =
    CATEGORY_BASE_WEIGHT[category as ClothingCategory] ?? CATEGORY_BASE_WEIGHT.other;
  const resolvedSize = sizeLabel ? resolveSizeForWeight(sizeLabel) : "66";
  const sizeScale = getSizeWeightScale(resolvedSize);
  const materialDensity = MATERIAL_DENSITY[materialCode] ?? 1.0;
  const thicknessWeight = THICKNESS_WEIGHT[thickness as ThicknessLevel] ?? 1.0;
  const fitWeight = FIT_WEIGHT[fitType] ?? 1.0;

  return Math.max(1, Math.round(base * sizeScale * materialDensity * thicknessWeight * fitWeight));
}

export function isClothingFitType(value: string): value is ClothingFitType {
  return FIT_TYPE_OPTIONS.some((option) => option.value === value);
}
