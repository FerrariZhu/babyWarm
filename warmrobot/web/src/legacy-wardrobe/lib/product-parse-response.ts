import type { SupabaseClient } from "@supabase/supabase-js";
import type { ThicknessLevel } from "@/lib/db/types";

export type ProductParsePayload = {
  name: string;
  category: string;
  material_id?: string;
  thickness: ThicknessLevel | string;
  size_label?: string | null;
  image_url?: string | null;
  price_text?: string | null;
  platform?: string | null;
  item_id?: string | null;
  canonical_url?: string | null;
  source: string;
  warnings: string[];
  material_hint?: string | null;
};

export async function resolveMaterialId(
  supabase: SupabaseClient,
  text: string
): Promise<string | undefined> {
  const { data: materialCode, error } = await supabase.rpc("match_material_by_keywords", {
    p_text: text,
  });

  if (error || !materialCode) return undefined;

  const { data: material } = await supabase
    .from("materials")
    .select("id")
    .eq("code", materialCode)
    .eq("is_active", true)
    .maybeSingle();

  return material?.id;
}

export async function getDefaultMaterialId(
  supabase: SupabaseClient
): Promise<string | undefined> {
  const { data } = await supabase
    .from("materials")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1);
  return data?.[0]?.id;
}

export type ProductParseApiResponse = ReturnType<typeof toApiParseResponse>;

export function toApiParseResponse(
  result: ProductParsePayload,
  jobId: string | null
) {
  return {
    job_id: jobId,
    name: result.name,
    category: result.category,
    material_id: result.material_id,
    thickness: result.thickness,
    size_label: result.size_label ?? null,
    image_url: result.image_url ?? null,
    price_text: result.price_text ?? null,
    platform: result.platform ?? null,
    item_id: result.item_id ?? null,
    canonical_url: result.canonical_url ?? null,
    warnings: result.warnings,
    material_hint: result.material_hint ?? null,
  };
}

export async function recordParseJob(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string,
  result: ProductParsePayload
): Promise<{ id: string } | null> {
  const { data: job, error } = await supabase
    .from("url_parse_jobs")
    .insert({
      user_id: userId,
      source_url: sourceUrl,
      status: "success",
      result,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[parse] url_parse_jobs insert failed:", error.message);
    return null;
  }
  return job;
}
