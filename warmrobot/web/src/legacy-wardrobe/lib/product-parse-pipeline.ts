import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectProductPlatform,
  parseTaobaoProductUrl,
} from "@/legacy-wardrobe/lib/taobao-product-parser";
import { extractProductFromScreenshot } from "@/legacy-wardrobe/lib/vision-product-parser";
import {
  getDefaultMaterialId,
  recordParseJob,
  resolveMaterialId,
  toApiParseResponse,
  type ProductParseApiResponse,
  type ProductParsePayload,
} from "@/legacy-wardrobe/lib/product-parse-response";
import {
  inferCategoryFromTitle,
  inferThicknessFromTitle,
} from "@/legacy-wardrobe/lib/product-parse-inference";
import { filterSizesForCategory } from "@/legacy-wardrobe/lib/clothing-enums";
import { fetchRemoteImage, uploadClothingImage } from "@/legacy-wardrobe/lib/clothing-image-storage";
import { getBeautifyProviderLabel, isBeautifyConfigured } from "@/legacy-wardrobe/lib/garment-beautify-client";
import { processGarmentImage } from "@/legacy-wardrobe/lib/garment-image-pipeline";
import { suggestSizeForCategory } from "@/lib/suggest-size";
import type { ParsedProductDraft, ProductPlatform } from "@/legacy-wardrobe/lib/product-parse-types";

export type { ParsedProductDraft, ProductPlatform, ProductParseSource } from "@/legacy-wardrobe/lib/product-parse-types";
export type { ProductParseApiResponse } from "@/legacy-wardrobe/lib/product-parse-response";

const FALLBACK_PRODUCT_NAME = "未知商品";

export function guessNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split("/").filter(Boolean).pop() ?? FALLBACK_PRODUCT_NAME;
    return decodeURIComponent(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  } catch {
    return FALLBACK_PRODUCT_NAME;
  }
}

function buildFallbackUrlDraft(
  sourceUrl: string,
  platform: ProductPlatform,
  titleHint?: string | null
): ParsedProductDraft {
  const name = titleHint?.trim() || guessNameFromUrl(sourceUrl);
  return {
    platform,
    itemId: null,
    canonicalUrl: sourceUrl,
    name,
    category: inferCategoryFromTitle(name),
    thickness: inferThicknessFromTitle(name),
    sizeLabel: null,
    imageUrl: null,
    priceText: null,
    materialHint: name,
    source: titleHint ? "share_text" : "fallback",
    warnings: ["暂不支持该链接平台，请手动核对商品信息。"],
  };
}

export async function parseProductFromUrl(
  sourceUrl: string,
  titleHint?: string | null
): Promise<ParsedProductDraft> {
  const platform = detectProductPlatform(sourceUrl);
  if (platform === "taobao" || platform === "tmall") {
    return parseTaobaoProductUrl(sourceUrl, titleHint);
  }
  return buildFallbackUrlDraft(sourceUrl, platform, titleHint);
}

export async function parseProductFromScreenshot(
  imageBase64: string,
  mimeType: string,
  linkedUrl?: string | null
): Promise<ParsedProductDraft> {
  return extractProductFromScreenshot(imageBase64, mimeType, linkedUrl);
}

async function resolveAgeBasedSizeLabel(
  supabase: SupabaseClient,
  userId: string,
  category: string
): Promise<string | null> {
  const [{ data: baby }, { data: sizeRows }] = await Promise.all([
    supabase
      .from("babies")
      .select("birth_date")
      .eq("user_id", userId)
      .order("is_active", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("size_labels").select("code, name_zh").eq("is_active", true),
  ]);

  if (!baby?.birth_date) return null;

  const sizes = (sizeRows ?? []).map((row) => ({
    code: row.code,
    label: row.name_zh,
  }));
  const allowedCodes = filterSizesForCategory(sizes, category).map((size) => size.code);

  return suggestSizeForCategory(category, allowedCodes, { birthDate: baby.birth_date });
}

async function resolveProcessedProductImageUrl(
  supabase: SupabaseClient,
  userId: string,
  options: {
    sourceImageBuffer?: Buffer;
    sourceMimeType?: string;
    fallbackImageUrl?: string | null;
    category?: string | null;
    name?: string | null;
    materialHint?: string | null;
  }
): Promise<{ imageUrl: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  let sourceBuffer = options.sourceImageBuffer ?? null;
  let mimeType = options.sourceMimeType ?? "image/jpeg";

  if (!sourceBuffer && options.fallbackImageUrl) {
    const fetched = await fetchRemoteImage(options.fallbackImageUrl);
    if (fetched) {
      sourceBuffer = fetched.buffer;
      mimeType = fetched.mimeType;
    } else {
      warnings.push("商品主图下载失败，无法生成抠图预览。");
      return { imageUrl: options.fallbackImageUrl ?? null, warnings };
    }
  }

  if (!sourceBuffer) {
    return { imageUrl: null, warnings };
  }

  try {
    const processed = await processGarmentImage({
      imageBuffer: sourceBuffer,
      mimeType,
      category: options.category,
      name: options.name,
      colorHint: options.materialHint,
    });
    const objectSuffix = `imports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const uploaded = await uploadClothingImage(
      supabase,
      userId,
      objectSuffix,
      processed.buffer,
      processed.mimeType
    );
    if (uploaded) {
      if (processed.warning) warnings.push(processed.warning);
      warnings.push(
        processed.beautified
          ? `商品图已通过 ${getBeautifyProviderLabel()} 生成白底头图。`
          : isBeautifyConfigured()
            ? "云抠图失败，已回退为本地裁剪白底。"
            : "商品图已裁剪为白底卡片（未配置云美化）。"
      );
      return { imageUrl: uploaded, warnings };
    }
  } catch (error) {
    console.error("[product-parse] image processing failed:", error);
    warnings.push("抠图处理失败，已保留原始商品图。");
  }

  return { imageUrl: options.fallbackImageUrl ?? null, warnings };
}

export async function finalizeParsedProductDraft(
  supabase: SupabaseClient,
  draft: ParsedProductDraft,
  options: {
    fallbackName?: string;
    linkedUrl?: string | null;
    userId?: string;
    sourceImageBuffer?: Buffer;
    sourceMimeType?: string;
  } = {}
): Promise<ProductParsePayload> {
  const defaultMaterialId = await getDefaultMaterialId(supabase);
  const materialHint = draft.materialHint ?? draft.name;
  const materialId =
    (materialHint ? await resolveMaterialId(supabase, materialHint) : undefined) ??
    defaultMaterialId;

  const warnings = [...(draft.warnings ?? [])];
  const productSizeHint = draft.sizeLabel;
  let sizeLabel: string | null = null;

  if (options.userId) {
    sizeLabel = await resolveAgeBasedSizeLabel(supabase, options.userId, draft.category);
    if (sizeLabel) {
      warnings.push("尺码已按宝宝年龄推荐，请核对后保存。");
      if (productSizeHint && productSizeHint !== sizeLabel) {
        warnings.push(`商品标注尺码「${productSizeHint}」未采用，已改为 ${sizeLabel} 码。`);
      }
    } else {
      warnings.push("请先完善宝宝生日，以便按年龄推荐尺码。");
    }
  }

  let imageUrl = draft.imageUrl ?? null;
  if (options.userId) {
    const processedImage = await resolveProcessedProductImageUrl(supabase, options.userId, {
      sourceImageBuffer: options.sourceImageBuffer,
      sourceMimeType: options.sourceMimeType,
      fallbackImageUrl: draft.imageUrl,
      category: draft.category,
      name: draft.name,
      materialHint: draft.materialHint,
    });
    if (processedImage.imageUrl) {
      imageUrl = processedImage.imageUrl;
    }
    warnings.push(...processedImage.warnings);
  }

  return {
    name: draft.name || options.fallbackName || FALLBACK_PRODUCT_NAME,
    category: draft.category,
    material_id: materialId,
    thickness: draft.thickness,
    size_label: sizeLabel,
    image_url: imageUrl,
    price_text: draft.priceText ?? null,
    platform: draft.platform,
    item_id: draft.itemId ?? null,
    canonical_url: draft.canonicalUrl || options.linkedUrl || null,
    source: draft.source,
    warnings,
    material_hint: draft.materialHint ?? null,
  };
}

export async function completeProductParse(
  supabase: SupabaseClient,
  userId: string,
  jobSourceUrl: string,
  draft: ParsedProductDraft,
  options: {
    fallbackName?: string;
    linkedUrl?: string | null;
    sourceImageBuffer?: Buffer;
    sourceMimeType?: string;
  } = {}
): Promise<{ payload: ProductParsePayload; apiResponse: ProductParseApiResponse }> {
  const payload = await finalizeParsedProductDraft(supabase, draft, {
    ...options,
    userId,
  });
  const job = await recordParseJob(supabase, userId, jobSourceUrl, payload);
  return {
    payload,
    apiResponse: toApiParseResponse(payload, job?.id ?? null),
  };
}
