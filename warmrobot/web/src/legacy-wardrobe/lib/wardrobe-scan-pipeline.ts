import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import {
  buildWardrobeItemEmbeddingText,
  createTextEmbedding,
  formatEmbeddingForPg,
  isEmbeddingConfigured,
} from "@/legacy-wardrobe/lib/catalog-embedding";
import {
  getDefaultMaterialId,
  resolveMaterialId,
} from "@/legacy-wardrobe/lib/product-parse-response";
import type { RawWardrobeVisionItem } from "@/legacy-wardrobe/lib/vision-wardrobe-parser";
import { filterSizesForCategory } from "@/legacy-wardrobe/lib/clothing-enums";
import { uploadClothingImage } from "@/legacy-wardrobe/lib/clothing-image-storage";
import { isBeautifyConfigured } from "@/legacy-wardrobe/lib/garment-beautify-client";
import {
  processGarmentImage,
  processGarmentImagesWithConcurrency,
} from "@/legacy-wardrobe/lib/garment-image-pipeline";
import { suggestSizeForCategory } from "@/lib/suggest-size";
import type {
  CatalogMatchResult,
  WardrobeScanApiResponse,
  WardrobeScanItemDraft,
} from "@/legacy-wardrobe/lib/wardrobe-scan-types";

const CONFIDENCE_AUTO_SELECT = 0.85;
const CATALOG_OVERRIDE_THRESHOLD = 0.78;
const VISION_LOW_CONFIDENCE = 0.65;

type CatalogMatchRow = {
  id: string;
  title: string;
  pic_url: string | null;
  inferred_category: string | null;
  inferred_thickness: string | null;
  material_hint: string | null;
  similarity: number;
};

function isThickness(value: string | null | undefined): value is ThicknessLevel {
  return value === "thin" || value === "medium" || value === "thick";
}

function tempId(index: number): string {
  return `scan-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

async function matchCatalogForItem(
  supabase: SupabaseClient,
  item: RawWardrobeVisionItem
): Promise<CatalogMatchResult | null> {
  if (!isEmbeddingConfigured()) return null;

  try {
    const text = buildWardrobeItemEmbeddingText({
      name: item.name_guess ?? "婴儿服装",
      category: item.category ?? "other",
      thickness: item.thickness ?? "medium",
      materialHint: item.material_hint,
      colorHint: item.color_hint,
      regionDescription: item.region_description,
    });
    const embedding = await createTextEmbedding(text);
    const { data, error } = await supabase.rpc("match_catalog_by_embedding", {
      p_embedding: formatEmbeddingForPg(embedding),
      p_match_count: 1,
      p_min_similarity: 0.72,
    });

    if (error || !data?.length) return null;

    const row = data[0] as CatalogMatchRow;
    return {
      catalogId: row.id,
      title: row.title,
      picUrl: row.pic_url,
      similarity: row.similarity,
      inferredCategory: row.inferred_category,
      inferredThickness: row.inferred_thickness,
      materialHint: row.material_hint,
    };
  } catch (error) {
    console.error("[wardrobe-scan] catalog match failed:", error);
    return null;
  }
}

function applyCatalogOverrides(
  visionItem: RawWardrobeVisionItem,
  catalogMatch: CatalogMatchResult | null
): {
  category: ClothingCategory;
  thickness: ThicknessLevel;
  materialHint: string | null;
  fieldSources: WardrobeScanItemDraft["fieldSources"];
} {
  const visionCategory = (visionItem.category ?? "other") as ClothingCategory;
  const visionThickness = (visionItem.thickness ?? "medium") as ThicknessLevel;
  const visionMaterialHint = visionItem.material_hint ?? null;
  const visionConfidence = visionItem.confidence ?? 0.5;

  const fieldSources: WardrobeScanItemDraft["fieldSources"] = {
    category: "vision",
    thickness: "vision",
    material: "vision",
  };

  if (!catalogMatch || catalogMatch.similarity < CATALOG_OVERRIDE_THRESHOLD) {
    return {
      category: visionCategory,
      thickness: visionThickness,
      materialHint: visionMaterialHint,
      fieldSources,
    };
  }

  let category = visionCategory;
  let thickness = visionThickness;
  let materialHint = visionMaterialHint;

  if (
    visionConfidence < VISION_LOW_CONFIDENCE &&
    catalogMatch.inferredCategory &&
    catalogMatch.inferredCategory !== visionCategory
  ) {
    category = catalogMatch.inferredCategory as ClothingCategory;
    fieldSources.category = "catalog";
  }

  if (
    visionConfidence < VISION_LOW_CONFIDENCE &&
    isThickness(catalogMatch.inferredThickness) &&
    catalogMatch.inferredThickness !== visionThickness
  ) {
    thickness = catalogMatch.inferredThickness;
    fieldSources.thickness = "catalog";
  }

  if (
    (!materialHint || visionConfidence < VISION_LOW_CONFIDENCE) &&
    catalogMatch.materialHint
  ) {
    materialHint = catalogMatch.materialHint;
    fieldSources.material = "catalog";
  }

  return { category, thickness, materialHint, fieldSources };
}

type SizeLabelOption = { code: string; label: string };

function resolveAgeBasedSizeForCategory(
  category: ClothingCategory,
  babyBirthDate: string | null | undefined,
  sizeOptions: SizeLabelOption[]
): Promise<string | null> {
  if (!babyBirthDate) return Promise.resolve(null);
  const allowedCodes = filterSizesForCategory(sizeOptions, category).map((size) => size.code);
  return Promise.resolve(
    suggestSizeForCategory(category, allowedCodes, { birthDate: babyBirthDate })
  );
}

async function attachGarmentPreviewImages(
  supabase: SupabaseClient,
  userId: string,
  sourceImageBuffer: Buffer,
  mimeType: string,
  items: WardrobeScanItemDraft[]
): Promise<void> {
  const imageConcurrency = isBeautifyConfigured() ? 2 : 4;
  await processGarmentImagesWithConcurrency(items, async (item) => {
    try {
      const processed = await processGarmentImage({
        imageBuffer: sourceImageBuffer,
        mimeType,
        boundingBox: item.boundingBox,
        category: item.category,
        name: item.name,
        regionDescription: item.regionDescription,
        colorHint: item.colorHint,
      });
      const previewImageUrl = await uploadClothingImage(
        supabase,
        userId,
        `drafts/${item.tempId}.webp`,
        processed.buffer,
        processed.mimeType
      );
      if (previewImageUrl) {
        item.previewImageUrl = previewImageUrl;
      }
      item.imageBeautified = processed.beautified;
      item.imageBeautifyFailed = isBeautifyConfigured() && !processed.beautified;
      if (processed.warning) {
        item.warnings.push(processed.warning);
      }
    } catch (error) {
      console.error("[wardrobe-scan] preview image failed:", error);
      item.warnings.push("抠图预览生成失败，保存时可能无图片。");
    }
  }, imageConcurrency);
}

export async function finalizeWardrobeScanItems(
  supabase: SupabaseClient,
  visionItems: RawWardrobeVisionItem[],
  options: {
    userId?: string;
    sourceImageBuffer?: Buffer;
    sourceMimeType?: string;
    babyBirthDate?: string | null;
    defaultSizeLabel?: string | null;
    sceneNotes?: string | null;
    globalWarnings?: string[];
  } = {}
): Promise<WardrobeScanItemDraft[]> {
  const defaultMaterialId = await getDefaultMaterialId(supabase);
  const { data: sizeRows } = await supabase
    .from("size_labels")
    .select("code, name_zh")
    .eq("is_active", true);
  const sizeOptions: SizeLabelOption[] = (sizeRows ?? []).map((row) => ({
    code: row.code,
    label: row.name_zh,
  }));
  const results: WardrobeScanItemDraft[] = [];

  for (const [index, visionItem] of visionItems.entries()) {
    const catalogMatch = await matchCatalogForItem(supabase, visionItem);
    const merged = applyCatalogOverrides(visionItem, catalogMatch);

    const materialHint = merged.materialHint ?? visionItem.name_guess ?? "";
    const materialId =
      (materialHint ? await resolveMaterialId(supabase, materialHint) : undefined) ??
      defaultMaterialId;

    const confidence = visionItem.confidence ?? 0.5;
    const warnings = [...(visionItem.warnings ?? [])];
    if (catalogMatch) {
      warnings.push(
        `参考商品：${catalogMatch.title.slice(0, 40)}（相似度 ${Math.round(catalogMatch.similarity * 100)}%）`
      );
    } else {
      warnings.push("未匹配到商品库，属性来自 AI 识别，请核对。");
    }

    const sizeLabel =
      (await resolveAgeBasedSizeForCategory(
        merged.category,
        options.babyBirthDate,
        sizeOptions
      )) ??
      options.defaultSizeLabel ??
      null;
    if (sizeLabel) {
      warnings.push(`尺码 ${sizeLabel} 码：按宝宝年龄推荐，请核对。`);
    } else if (!options.babyBirthDate) {
      warnings.push("请先完善宝宝生日，以便按年龄推荐尺码。");
    }

    results.push({
      tempId: tempId(index),
      name: visionItem.name_guess ?? `衣物 ${index + 1}`,
      category: merged.category,
      thickness: merged.thickness,
      materialHint: merged.materialHint,
      materialId,
      sizeLabel,
      confidence,
      regionDescription: visionItem.region_description ?? null,
      colorHint: visionItem.color_hint ?? null,
      boundingBox: visionItem.bounding_box ?? null,
      previewImageUrl: null,
      imageBeautified: false,
      imageBeautifyFailed: false,
      warnings,
      selected: confidence >= CONFIDENCE_AUTO_SELECT,
      catalogMatch,
      fieldSources: merged.fieldSources,
    });
  }

  if (options.userId && options.sourceImageBuffer) {
    await attachGarmentPreviewImages(
      supabase,
      options.userId,
      options.sourceImageBuffer,
      options.sourceMimeType ?? "image/jpeg",
      results
    );
  }

  return results;
}

export async function recordWardrobeScanJob(
  supabase: SupabaseClient,
  userId: string,
  scanImageUrl: string | null,
  response: WardrobeScanApiResponse
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("wardrobe_scan_jobs")
    .insert({
      user_id: userId,
      scan_image_url: scanImageUrl,
      status: "success",
      item_count: response.items.length,
      result: response,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[wardrobe-scan] job insert failed:", error.message);
    return null;
  }
  return data;
}

export function buildScanApiResponse(
  items: WardrobeScanItemDraft[],
  options: {
    jobId?: string | null;
    scanImageUrl?: string | null;
    sceneNotes?: string | null;
    warnings?: string[];
  } = {}
): WardrobeScanApiResponse {
  return {
    job_id: options.jobId ?? null,
    scan_image_url: options.scanImageUrl ?? null,
    scene_notes: options.sceneNotes ?? null,
    items,
    warnings: options.warnings ?? [],
  };
}
