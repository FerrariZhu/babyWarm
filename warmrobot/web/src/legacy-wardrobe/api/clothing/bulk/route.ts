import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import {
  validateAndNormalizeClothingCreate,
  type ClothingCreateBody,
} from "@/legacy-wardrobe/lib/clothing-validation";
import { createClient } from "@/lib/supabase/server";
import {
  filterMaterialsForCategory,
  filterSizesForCategory,
  isShoeCategory,
} from "@/legacy-wardrobe/lib/clothing-enums";
import { estimateClothingWeightGrams } from "@/lib/clothing-weight";
import {
  copyClothingImageToItem,
} from "@/legacy-wardrobe/lib/clothing-image-storage";
import type { WardrobeScanBulkItem } from "@/legacy-wardrobe/lib/wardrobe-scan-types";

type BulkCreateBody = {
  items?: WardrobeScanBulkItem[];
  baby_id?: string | null;
  scan_job_id?: string | null;
};

async function resolveUnspecifiedMaterialId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data } = await supabase
    .from("materials")
    .select("id")
    .eq("code", "unspecified")
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

async function createOneItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: WardrobeScanBulkItem,
  context: {
    allMaterials: { id: string; code: string; name_zh: string }[];
    allSizes: { code: string; name_zh: string }[];
    shoeUnspecifiedMaterialId: string | null;
    babyId: string | null;
    scanJobId: string | null;
  }
) {
  const category = body.category != null ? String(body.category) : "";
  let effectiveMaterialId =
    body.material_id != null ? String(body.material_id) : undefined;
  if (category && isShoeCategory(category)) {
    effectiveMaterialId = context.shoeUnspecifiedMaterialId ?? effectiveMaterialId;
  }

  const { data: material } = effectiveMaterialId
    ? await supabase
        .from("materials")
        .select("id, code")
        .eq("id", effectiveMaterialId)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };

  const allowedMaterials = filterMaterialsForCategory(
    context.allMaterials.map((row) => ({ id: row.id, code: row.code, name: row.name_zh })),
    category
  );
  const allowedSizes = filterSizesForCategory(
    context.allSizes.map((row) => ({ code: row.code, label: row.name_zh })),
    category
  );

  const createBody: ClothingCreateBody = {
    name: body.name,
    category: body.category,
    material_id: body.material_id,
    thickness: body.thickness,
    size_label: body.size_label,
    fit_type: body.fit_type,
    fill_type: body.fill_type,
    bodysuit_style: body.bodysuit_style,
    pant_length: body.pant_length,
    sock_height: body.sock_height,
    baby_id: context.babyId,
    source_metadata: {
      ...(body.source_metadata ?? {}),
      scan_job_id: context.scanJobId,
      source: "wardrobe_scan",
    },
  };

  const validation = validateAndNormalizeClothingCreate(createBody, {
    material: material?.code ? { id: material.id, code: material.code } : null,
    allowedMaterialIds: allowedMaterials.map((row) => row.id),
    allowedSizeCodes: allowedSizes.map((row) => row.code),
    shoeUnspecifiedMaterialId: context.shoeUnspecifiedMaterialId,
  });

  if (!validation.ok) {
    return { ok: false as const, error: validation.error, name: body.name };
  }

  const normalized = validation.data;
  const resolvedWeight = estimateClothingWeightGrams({
    category: normalized.category,
    materialCode: normalized.materialCode,
    thickness: normalized.thickness,
    sizeLabel: normalized.sizeLabel ?? "",
    fitType: normalized.fitType,
  });

  const breathability =
    normalized.thickness === "thin"
      ? "high"
      : normalized.thickness === "thick"
        ? "low"
        : "medium";

  const { data, error } = await supabase
    .from("clothing_items")
    .insert({
      user_id: userId,
      baby_id: normalized.babyId,
      name: normalized.name,
      category: normalized.category,
      material_id: normalized.materialId,
      thickness: normalized.thickness,
      size_label: normalized.sizeLabel,
      fit_type: normalized.fitType,
      fill_type: normalized.fillType,
      bodysuit_style: normalized.bodysuitStyle,
      pant_length: normalized.pantLength,
      sock_height: normalized.sockHeight,
      weight_grams: resolvedWeight,
      image_url: body.image_url ?? null,
      source: "wardrobe_scan",
      source_metadata: normalized.sourceMetadata,
      breathability,
      is_available: true,
    })
    .select("id, name, category, warmth_score")
    .single();

  if (error) {
    return { ok: false as const, error: error.message, name: body.name };
  }

  let finalImageUrl = body.image_url ?? null;
  if (body.temp_id) {
    const copiedUrl = await copyClothingImageToItem(
      supabase,
      userId,
      `drafts/${body.temp_id}.webp`,
      data.id
    );
    if (copiedUrl) {
      finalImageUrl = copiedUrl;
      await supabase
        .from("clothing_items")
        .update({ image_url: finalImageUrl })
        .eq("id", data.id)
        .eq("user_id", userId);
    }
  }

  return { ok: true as const, data: { ...data, image_url: finalImageUrl } };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<BulkCreateBody>(request);
  if (!parsed.ok) return parsed.response;

  const items = parsed.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "请至少选择一件衣物保存" }, { status: 400 });
  }
  if (items.length > 30) {
    return NextResponse.json({ error: "单次最多保存 30 件" }, { status: 400 });
  }

  const [{ data: allMaterials }, { data: allSizes }] = await Promise.all([
    supabase.from("materials").select("id, code, name_zh").eq("is_active", true),
    supabase.from("size_labels").select("code, name_zh").eq("is_active", true),
  ]);

  const shoeUnspecifiedMaterialId = await resolveUnspecifiedMaterialId(supabase);
  const babyId =
    parsed.body.baby_id != null && parsed.body.baby_id !== ""
      ? String(parsed.body.baby_id)
      : null;
  const scanJobId =
    parsed.body.scan_job_id != null && parsed.body.scan_job_id !== ""
      ? String(parsed.body.scan_job_id)
      : null;

  const created: { id: string; name: string; category: string; warmth_score: number }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const item of items) {
    const result = await createOneItem(supabase, user.id, item, {
      allMaterials: allMaterials ?? [],
      allSizes: allSizes ?? [],
      shoeUnspecifiedMaterialId,
      babyId,
      scanJobId,
    });

    if (result.ok) {
      created.push(result.data);
    } else {
      errors.push({ name: result.name, error: result.error });
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "全部保存失败", errors },
      { status: 400 }
    );
  }

  return NextResponse.json({
    created_count: created.length,
    created,
    errors,
  });
}
