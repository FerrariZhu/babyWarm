import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildScanApiResponse,
  finalizeWardrobeScanItems,
  recordWardrobeScanJob,
} from "@/legacy-wardrobe/lib/wardrobe-scan-pipeline";
import { getBeautifyProviderLabel, isBeautifyConfigured } from "@/legacy-wardrobe/lib/garment-beautify-client";
import { extractWardrobeItemsFromPhoto } from "@/legacy-wardrobe/lib/vision-wardrobe-parser";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";
import { prepareVisionImageBase64 } from "@/legacy-wardrobe/lib/vision-image-prep";
import {
  checkVisionHealth,
  visionSetupHint,
} from "@/legacy-wardrobe/lib/multimodal-vision";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function getBabyBirthDate(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: baby } = await supabase
    .from("babies")
    .select("birth_date")
    .eq("user_id", userId)
    .order("is_active", { ascending: false })
    .limit(1)
    .maybeSingle();

  return baby?.birth_date ?? null;
}

async function uploadScanImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string | null> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${userId}/${Date.now()}-wardrobe.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("wardrobe-scans").upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("[wardrobe-scan] storage upload failed:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("wardrobe-scans").getPublicUrl(objectPath);
  return data.publicUrl ?? null;
}

export const maxDuration = 600;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传衣柜照片" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 照片" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "照片请小于 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const visionHealthy = await checkVisionHealth();
    if (!visionHealthy) {
      return NextResponse.json({ error: visionSetupHint() }, { status: 503 });
    }

    const prepared = await prepareVisionImageBase64(buffer, file.type);
    const base64 = prepared.base64;

    const [visionResult, scanImageUrl, babyBirthDate] = await Promise.all([
      extractWardrobeItemsFromPhoto(base64, prepared.mimeType),
      uploadScanImage(supabase, user.id, file),
      getBabyBirthDate(supabase, user.id),
    ]);

    const defaultSizeLabel = babyBirthDate
      ? suggestBabyCurrentSize({ birthDate: babyBirthDate })
      : null;

    const items = await finalizeWardrobeScanItems(supabase, visionResult.items, {
      userId: user.id,
      sourceImageBuffer: buffer,
      sourceMimeType: file.type,
      babyBirthDate,
      defaultSizeLabel,
      sceneNotes: visionResult.sceneNotes,
      globalWarnings: visionResult.warnings,
    });

    const beautifiedCount = items.filter((item) => item.imageBeautified).length;
    const imageFallbackCount = items.filter((item) => item.imageBeautifyFailed).length;

    const warnings = [
      ...visionResult.warnings,
      `衣物识别：${visionResult.providerLabel}`,
      isBeautifyConfigured()
        ? `商品抠图：${getBeautifyProviderLabel()}`
        : "商品抠图：本地裁剪白底（未配置 BEAUTIFY_ENABLED / API Key）",
      beautifiedCount > 0
        ? `已为 ${beautifiedCount} 件生成白底商品图，请核对预览后保存。`
        : null,
      imageFallbackCount > 0
        ? `${imageFallbackCount} 件云抠图失败，已回退为本地裁剪白底，请查看单品提示。`
        : null,
      prepared.resized ? "照片已自动压缩以加快识别。" : "",
      visionResult.sceneNotes ? `场景：${visionResult.sceneNotes}` : "",
    ].filter(Boolean) as string[];

    const apiResponse = buildScanApiResponse(items, {
      scanImageUrl,
      sceneNotes: visionResult.sceneNotes,
      warnings,
    });

    const job = await recordWardrobeScanJob(supabase, user.id, scanImageUrl, apiResponse);
    apiResponse.job_id = job?.id ?? null;

    return NextResponse.json(apiResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "衣柜识别失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
