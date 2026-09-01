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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<ClothingCreateBody>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const [{ data: allMaterials }, { data: allSizes }] = await Promise.all([
    supabase.from("materials").select("id, code, name_zh").eq("is_active", true),
    supabase.from("size_labels").select("code, name_zh").eq("is_active", true),
  ]);

  const category = body.category != null ? String(body.category) : "";
  const shoeUnspecifiedMaterialId = await resolveUnspecifiedMaterialId(supabase);
  let effectiveMaterialId =
    body.material_id != null ? String(body.material_id) : undefined;
  if (category && isShoeCategory(category)) {
    effectiveMaterialId = shoeUnspecifiedMaterialId ?? effectiveMaterialId;
  }

  const { data: material, error: materialError } = effectiveMaterialId
    ? await supabase
        .from("materials")
        .select("id, code")
        .eq("id", effectiveMaterialId)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null, error: null };

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }

  const allowedMaterials = filterMaterialsForCategory(
    (allMaterials ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name_zh })),
    category
  );
  const allowedSizes = filterSizesForCategory(
    (allSizes ?? []).map((row) => ({ code: row.code, label: row.name_zh })),
    category
  );

  const validation = validateAndNormalizeClothingCreate(body, {
    material: material?.code ? { id: material.id, code: material.code } : null,
    allowedMaterialIds: allowedMaterials.map((row) => row.id),
    allowedSizeCodes: allowedSizes.map((row) => row.code),
    shoeUnspecifiedMaterialId,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const normalized = validation.data;
  let resolvedWeight = normalized.rawWeightGrams;
  if (resolvedWeight == null || Number.isNaN(resolvedWeight)) {
    resolvedWeight = estimateClothingWeightGrams({
      category: normalized.category,
      materialCode: normalized.materialCode,
      thickness: normalized.thickness,
      sizeLabel: normalized.sizeLabel ?? "",
      fitType: normalized.fitType,
    });
  }

  const breathability =
    normalized.thickness === "thin"
      ? "high"
      : normalized.thickness === "thick"
        ? "low"
        : "medium";

  const { data, error } = await supabase
    .from("clothing_items")
    .insert({
      user_id: user.id,
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
      source_url: normalized.sourceUrl,
      image_url: normalized.imageUrl,
      source_metadata: normalized.sourceMetadata,
      source: normalized.sourceUrl ? "url" : "manual",
      breathability,
      is_available: true,
    })
    .select(
      "id, name, size_label, breathability, image_url, weight_grams, fit_type, fill_type, bodysuit_style, pant_length, sock_height"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (normalized.parseJobId) {
    await supabase
      .from("url_parse_jobs")
      .update({ clothing_item_id: data.id })
      .eq("id", normalized.parseJobId)
      .eq("user_id", user.id);
  }

  return NextResponse.json(data);
}
