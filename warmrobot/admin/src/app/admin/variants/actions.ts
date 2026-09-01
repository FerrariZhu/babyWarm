"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type {
  AdminVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from "@/lib/admin/variant-types";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "无权限：需要管理员登录" };
  return { ok: true, data: undefined };
}

type VariantRow = {
  id: string;
  category_id: string | null;
  category_code: string;
  material: string | null;
  fill_type: string | null;
  thickness: string | null;
  fit_type: string | null;
  bodysuit_style: string | null;
  pant_length: string | null;
  sock_height: string | null;
  hat_kind: string | null;
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

function mapVariant(row: VariantRow): AdminVariant {
  return {
    id: row.id,
    category_id: row.category_id,
    category_code: row.category_code,
    material: row.material,
    fill_type: row.fill_type,
    thickness: row.thickness,
    fit_type: row.fit_type,
    bodysuit_style: row.bodysuit_style,
    pant_length: row.pant_length,
    sock_height: row.sock_height,
    hat_kind: row.hat_kind ?? null,
    warmth_value: Number(row.warmth_value),
    admin_label: row.admin_label,
    consumer_label: row.consumer_label,
    consumer_label_en: row.consumer_label_en ?? "",
    consumer_tags: row.consumer_tags ?? [],
    pros: row.pros ?? "",
    cons: row.cons ?? "",
    usage_tips: row.usage_tips ?? "",
    is_active: row.is_active,
    sort_order: row.sort_order,
  };
}

const VARIANT_SELECT =
  "id, category_id, category_code, material, fill_type, thickness, fit_type, bodysuit_style, pant_length, sock_height, hat_kind, warmth_value, admin_label, consumer_label, consumer_label_en, consumer_tags, pros, cons, usage_tips, is_active, sort_order";

type AxisTuple = {
  category_id: string | null;
  material: string | null;
  fill_type: string | null;
  thickness: string | null;
  fit_type: string | null;
  bodysuit_style: string | null;
  pant_length: string | null;
  sock_height: string | null;
};

async function assertUniqueAxisTuple(
  supabase: ReturnType<typeof createServiceClient>,
  tuple: AxisTuple,
  excludeId?: string
): Promise<ActionResult> {
  let query = supabase.from("garment_variants").select("id").eq("category_id", tuple.category_id);

  const axisFields: (keyof Omit<AxisTuple, "category_id">)[] = [
    "material",
    "fill_type",
    "thickness",
    "fit_type",
    "bodysuit_style",
    "pant_length",
    "sock_height",
  ];
  for (const field of axisFields) {
    const value = tuple[field];
    query = value == null ? query.is(field, null) : query.eq(field, value);
  }

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (data) {
    return { ok: false, error: "该材料/版型/属性组合已存在，请调整轴字段" };
  }
  return { ok: true, data: undefined };
}

export async function listAdminVariants(
  categoryCode?: string
): Promise<ActionResult<AdminVariant[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("garment_variants")
      .select(VARIANT_SELECT)
      .order("category_code", { ascending: true })
      .order("sort_order", { ascending: true });

    if (categoryCode) {
      query = query.eq("category_code", categoryCode);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return { ok: true, data: (data as VariantRow[]).map(mapVariant) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载失败" };
  }
}

export async function createVariant(
  input: CreateVariantInput
): Promise<ActionResult<AdminVariant>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const consumer_label = input.consumer_label.trim();
  const consumer_label_en = input.consumer_label_en.trim();
  if (!consumer_label) return { ok: false, error: "类型名称不能为空" };
  if (!consumer_label_en) return { ok: false, error: "类型英文名称不能为空" };
  const warmth_value = Number(input.warmth_value);
  if (!Number.isInteger(warmth_value) || warmth_value < 0 || warmth_value > 100) {
    return { ok: false, error: "保暖值须为 0–100 整数" };
  }

  const axisTuple: AxisTuple = {
    category_id: input.category_id,
    material: input.material ?? null,
    fill_type: input.fill_type ?? null,
    thickness: input.thickness ?? null,
    fit_type: input.fit_type ?? "regular",
    bodysuit_style: input.bodysuit_style ?? null,
    pant_length: input.pant_length ?? null,
    sock_height: input.sock_height ?? null,
  };

  try {
    const supabase = createServiceClient();
    const unique = await assertUniqueAxisTuple(supabase, axisTuple);
    if (!unique.ok) return unique;

    const { data: maxSort } = await supabase
      .from("garment_variants")
      .select("sort_order")
      .eq("category_code", input.category_code)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const admin_label = `${input.category_code}-${consumer_label}`;

    const { data, error } = await supabase
      .from("garment_variants")
      .insert({
        category_id: input.category_id,
        category_code: input.category_code,
        material: axisTuple.material,
        fill_type: axisTuple.fill_type,
        thickness: axisTuple.thickness,
        fit_type: axisTuple.fit_type,
        bodysuit_style: axisTuple.bodysuit_style,
        pant_length: axisTuple.pant_length,
        sock_height: axisTuple.sock_height,
        warmth_value,
        admin_label,
        consumer_label,
        consumer_label_en,
        consumer_tags: [],
        is_active: input.is_active ?? true,
        sort_order: (maxSort?.sort_order ?? 0) + 1,
      })
      .select(VARIANT_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapVariant(data as VariantRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateVariant(
  input: UpdateVariantInput
): Promise<ActionResult<AdminVariant>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.consumer_label !== undefined) {
    const label = input.consumer_label.trim();
    if (!label) return { ok: false, error: "类型名称不能为空" };
    patch.consumer_label = label;
  }
  if (input.consumer_label_en !== undefined) {
    const labelEn = input.consumer_label_en.trim();
    if (!labelEn) return { ok: false, error: "类型英文名称不能为空" };
    patch.consumer_label_en = labelEn;
  }
  if (input.pros !== undefined) {
    patch.pros = input.pros.trim();
  }
  if (input.usage_tips !== undefined) {
    patch.usage_tips = input.usage_tips.trim();
  }
  if (input.warmth_value !== undefined) {
    const v = Number(input.warmth_value);
    if (!Number.isInteger(v) || v < 0 || v > 100) {
      return { ok: false, error: "保暖值须为 0–100 整数" };
    }
    patch.warmth_value = v;
  }
  if (input.is_active !== undefined) {
    patch.is_active = input.is_active;
  }

  const axisKeys = [
    "material",
    "fill_type",
    "thickness",
    "fit_type",
    "bodysuit_style",
    "pant_length",
    "sock_height",
  ] as const;
  for (const key of axisKeys) {
    if (input[key] !== undefined) {
      patch[key] = input[key];
    }
  }

  try {
    const supabase = createServiceClient();

    const axisChanged = axisKeys.some((key) => input[key] !== undefined);
    if (axisChanged) {
      const { data: current, error: loadError } = await supabase
        .from("garment_variants")
        .select(VARIANT_SELECT)
        .eq("id", input.id)
        .single();
      if (loadError) return { ok: false, error: loadError.message };

      const row = current as VariantRow;
      const tuple: AxisTuple = {
        category_id: row.category_id,
        material:
          input.material !== undefined ? input.material : row.material,
        fill_type:
          input.fill_type !== undefined ? input.fill_type : row.fill_type,
        thickness:
          input.thickness !== undefined ? input.thickness : row.thickness,
        fit_type:
          input.fit_type !== undefined ? input.fit_type : row.fit_type ?? "regular",
        bodysuit_style:
          input.bodysuit_style !== undefined
            ? input.bodysuit_style
            : row.bodysuit_style,
        pant_length:
          input.pant_length !== undefined ? input.pant_length : row.pant_length,
        sock_height:
          input.sock_height !== undefined ? input.sock_height : row.sock_height,
      };

      const unique = await assertUniqueAxisTuple(supabase, tuple, input.id);
      if (!unique.ok) return unique;
    }

    const { data, error } = await supabase
      .from("garment_variants")
      .update(patch)
      .eq("id", input.id)
      .select(VARIANT_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapVariant(data as VariantRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export type { CreateVariantInput, UpdateVariantInput };
