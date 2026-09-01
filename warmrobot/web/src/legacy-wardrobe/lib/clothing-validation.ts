import type { ClothingCategory } from "@warmrobot/core";
import { isClothingCategory } from "@/lib/clothing-categories";
import {
  getCategoryFieldConfig,
  getFitOptionsForCategory,
  isBodysuitStyle,
  isFillType,
  isPantLength,
  isShoeCategory,
  isSockHeight,
  type CategoryFieldConfig,
} from "@/legacy-wardrobe/lib/clothing-enums";
import { isClothingFitType, type ClothingFitType } from "@/lib/clothing-weight";

export type ClothingFormValues = {
  name: string;
  category: string;
  materialId: string;
  fillType: string;
  sockHeight: string;
};

export type ClothingCreateBody = {
  name?: unknown;
  category?: unknown;
  material_id?: unknown;
  thickness?: unknown;
  size_label?: unknown;
  fit_type?: unknown;
  fill_type?: unknown;
  bodysuit_style?: unknown;
  pant_length?: unknown;
  sock_height?: unknown;
  weight_grams?: unknown;
  baby_id?: unknown;
  source_url?: unknown;
  image_url?: unknown;
  source_metadata?: unknown;
  parse_job_id?: unknown;
};

export type NormalizedClothingCreate = {
  name: string;
  category: ClothingCategory;
  materialId: string;
  materialCode: string;
  thickness: string;
  fitType: ClothingFitType;
  sizeLabel: string | null;
  fillType: string | null;
  bodysuitStyle: string | null;
  pantLength: string | null;
  sockHeight: string | null;
  rawWeightGrams: number | null;
  babyId: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  sourceMetadata: Record<string, unknown>;
  parseJobId: string | null;
  fieldConfig: CategoryFieldConfig;
};

export type ValidateClothingCreateContext = {
  material: { id: string; code: string } | null;
  allowedMaterialIds: string[];
  allowedSizeCodes: string[];
  shoeUnspecifiedMaterialId?: string | null;
};

export function validateClothingFormFields(values: ClothingFormValues): string | null {
  const trimmedName = values.name.trim();
  if (!trimmedName || !values.category) {
    return "请填写名称并选择类别。";
  }
  if (!isClothingCategory(values.category)) {
    return "请选择有效类别。";
  }

  const fieldConfig = getCategoryFieldConfig(values.category);
  if (fieldConfig.showMaterial && !values.materialId) {
    return "请选择材质。";
  }
  if (fieldConfig.showFillType && !values.fillType) {
    return "请选择棉衣填充物。";
  }
  if (fieldConfig.showSockHeight && !values.sockHeight) {
    return "请选择袜筒高度。";
  }

  return null;
}

export function buildClothingCreatePayload(values: {
  name: string;
  category: string;
  materialId: string;
  thickness: string;
  sizeLabel: string;
  fitType: ClothingFitType;
  fillType: string;
  bodysuitStyle: string;
  pantLength: string;
  sockHeight: string;
  estimatedWeightGrams: number | null;
  babyId?: string;
  canonicalSourceUrl: string | null;
  url: string;
  imageUrl: string | null;
  parseMetadata: Record<string, unknown> | null;
  parseJobId: string | null;
}): Record<string, unknown> {
  return {
    name: values.name.trim(),
    category: values.category,
    material_id: values.materialId || undefined,
    thickness: values.thickness,
    size_label: values.sizeLabel || null,
    fit_type: values.fitType,
    fill_type: values.fillType || null,
    bodysuit_style: values.bodysuitStyle || null,
    pant_length: values.pantLength || null,
    sock_height: values.sockHeight || null,
    weight_grams: values.estimatedWeightGrams,
    baby_id: values.babyId ?? null,
    source_url: values.canonicalSourceUrl ?? (values.url.trim() || null),
    image_url: values.imageUrl,
    source_metadata: values.parseMetadata ?? undefined,
    parse_job_id: values.parseJobId ?? undefined,
  };
}

export function validateAndNormalizeClothingCreate(
  body: ClothingCreateBody,
  context: ValidateClothingCreateContext
): { ok: true; data: NormalizedClothingCreate } | { ok: false; error: string } {
  const { name, category } = body;

  if (!name || category == null || category === "") {
    return { ok: false, error: "Missing required fields" };
  }

  const categoryCode = String(category);
  if (!isClothingCategory(categoryCode)) {
    return { ok: false, error: "无效的类别" };
  }

  const fieldConfig = getCategoryFieldConfig(categoryCode);
  const shoe = isShoeCategory(categoryCode);

  let materialId = body.material_id != null ? String(body.material_id) : undefined;
  if (shoe) {
    materialId = context.shoeUnspecifiedMaterialId ?? materialId;
  }
  if (!materialId) {
    return { ok: false, error: "Missing required fields" };
  }

  const thickness = fieldConfig.showThickness
    ? String(body.thickness ?? fieldConfig.defaultThickness)
    : fieldConfig.defaultThickness;

  const fitTypeRaw = fieldConfig.showFit
    ? String(body.fit_type ?? fieldConfig.defaultFit)
    : fieldConfig.defaultFit;

  if (!isClothingFitType(fitTypeRaw)) {
    return { ok: false, error: "无效的版型" };
  }

  const allowedFit = getFitOptionsForCategory(categoryCode).map((option) => option.value);
  if (fieldConfig.showFit && !allowedFit.includes(fitTypeRaw)) {
    return { ok: false, error: "该类别不支持所选版型" };
  }

  if (!context.material?.code || context.material.id !== materialId) {
    return { ok: false, error: "无效的材质" };
  }
  if (!context.allowedMaterialIds.includes(materialId)) {
    return { ok: false, error: "该类别不支持所选材质" };
  }

  const sizeLabel =
    body.size_label != null && body.size_label !== "" ? String(body.size_label) : null;
  if (fieldConfig.showSize && sizeLabel) {
    if (!context.allowedSizeCodes.includes(sizeLabel)) {
      return { ok: false, error: "该类别不支持所选尺码" };
    }
  }

  const fillType = body.fill_type != null && body.fill_type !== "" ? String(body.fill_type) : null;
  if (fieldConfig.showFillType) {
    if (!fillType || !isFillType(fillType)) {
      return { ok: false, error: "请选择棉衣填充物" };
    }
  } else if (fillType) {
    return { ok: false, error: "该类别不支持填充物" };
  }

  const bodysuitStyle =
    body.bodysuit_style != null && body.bodysuit_style !== ""
      ? String(body.bodysuit_style)
      : null;
  if (bodysuitStyle && !fieldConfig.showBodysuitStyle) {
    return { ok: false, error: "该类别不支持包屁衣款式" };
  }
  if (fieldConfig.showBodysuitStyle && bodysuitStyle && !isBodysuitStyle(bodysuitStyle)) {
    return { ok: false, error: "无效的包屁衣款式" };
  }

  const pantLength = fieldConfig.showPantLength
    ? body.pant_length != null && body.pant_length !== ""
      ? String(body.pant_length)
      : null
    : fieldConfig.defaultPantLength;
  if (pantLength && !isPantLength(pantLength)) {
    return { ok: false, error: "无效的裤长" };
  }

  const sockHeight =
    body.sock_height != null && body.sock_height !== "" ? String(body.sock_height) : null;
  if (fieldConfig.showSockHeight) {
    if (!sockHeight || !isSockHeight(sockHeight)) {
      return { ok: false, error: "请选择袜筒高度" };
    }
  } else if (sockHeight) {
    return { ok: false, error: "该类别不支持袜筒高度" };
  }

  const rawWeightGrams =
    body.weight_grams != null && body.weight_grams !== "" ? Number(body.weight_grams) : null;

  const babyId =
    body.baby_id != null && body.baby_id !== "" ? String(body.baby_id) : null;
  const sourceUrl =
    body.source_url != null && body.source_url !== "" ? String(body.source_url) : null;
  const imageUrl =
    body.image_url != null && body.image_url !== "" ? String(body.image_url) : null;
  const sourceMetadata =
    body.source_metadata && typeof body.source_metadata === "object"
      ? (body.source_metadata as Record<string, unknown>)
      : {};
  const parseJobId =
    body.parse_job_id != null && body.parse_job_id !== "" ? String(body.parse_job_id) : null;

  return {
    ok: true,
    data: {
      name: String(name).trim(),
      category: categoryCode,
      materialId,
      materialCode: context.material.code,
      thickness,
      fitType: fitTypeRaw,
      sizeLabel: fieldConfig.showSize ? sizeLabel : null,
      fillType: fieldConfig.showFillType ? fillType : null,
      bodysuitStyle: fieldConfig.showBodysuitStyle ? bodysuitStyle : null,
      pantLength: pantLength ?? null,
      sockHeight: fieldConfig.showSockHeight ? sockHeight : null,
      rawWeightGrams:
        rawWeightGrams != null && !Number.isNaN(rawWeightGrams) ? rawWeightGrams : null,
      babyId,
      sourceUrl,
      imageUrl,
      sourceMetadata,
      parseJobId,
      fieldConfig,
    },
  };
}
