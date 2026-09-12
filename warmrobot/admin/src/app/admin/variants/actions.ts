"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type {
  AdminVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from "@/lib/admin/variant-types";
import { query, queryOne } from "@/lib/self-hosted/database";

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
  tuple: AxisTuple,
  excludeId?: string
): Promise<ActionResult> {
  const duplicate = await queryOne<{ id: string }>(
    `SELECT id
       FROM public.garment_variants
      WHERE category_id IS NOT DISTINCT FROM $1
        AND material IS NOT DISTINCT FROM $2
        AND fill_type IS NOT DISTINCT FROM $3
        AND thickness IS NOT DISTINCT FROM $4
        AND fit_type IS NOT DISTINCT FROM $5
        AND bodysuit_style IS NOT DISTINCT FROM $6
        AND pant_length IS NOT DISTINCT FROM $7
        AND sock_height IS NOT DISTINCT FROM $8
        AND ($9::uuid IS NULL OR id <> $9)
      LIMIT 1`,
    [
      tuple.category_id,
      tuple.material,
      tuple.fill_type,
      tuple.thickness,
      tuple.fit_type,
      tuple.bodysuit_style,
      tuple.pant_length,
      tuple.sock_height,
      excludeId ?? null,
    ]
  );
  if (duplicate) {
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
    const data = await query<VariantRow>(
      `SELECT ${VARIANT_SELECT}
         FROM public.garment_variants
        WHERE ($1::text IS NULL OR category_code = $1)
        ORDER BY category_code ASC, sort_order ASC`,
      [categoryCode ?? null]
    );
    return { ok: true, data: data.map(mapVariant) };
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
    const unique = await assertUniqueAxisTuple(axisTuple);
    if (!unique.ok) return unique;

    const maxSort = await queryOne<{ sort_order: number }>(
      "SELECT sort_order FROM public.garment_variants WHERE category_code = $1 ORDER BY sort_order DESC LIMIT 1",
      [input.category_code]
    );

    const admin_label = `${input.category_code}-${consumer_label}`;

    const data = await queryOne<VariantRow>(
      `INSERT INTO public.garment_variants
        (category_id, category_code, material, fill_type, thickness, fit_type,
         bodysuit_style, pant_length, sock_height, warmth_value, admin_label,
         consumer_label, consumer_label_en, consumer_tags, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING ${VARIANT_SELECT}`,
      [
        input.category_id,
        input.category_code,
        axisTuple.material,
        axisTuple.fill_type,
        axisTuple.thickness,
        axisTuple.fit_type,
        axisTuple.bodysuit_style,
        axisTuple.pant_length,
        axisTuple.sock_height,
        warmth_value,
        admin_label,
        consumer_label,
        consumer_label_en,
        [],
        input.is_active ?? true,
        (maxSort?.sort_order ?? 0) + 1,
      ]
    );
    if (!data) return { ok: false, error: "创建失败" };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapVariant(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateVariant(
  input: UpdateVariantInput
): Promise<ActionResult<AdminVariant>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const patch: Array<{ column: string; value: unknown }> = [];

  if (input.consumer_label !== undefined) {
    const label = input.consumer_label.trim();
    if (!label) return { ok: false, error: "类型名称不能为空" };
    patch.push({ column: "consumer_label", value: label });
  }
  if (input.consumer_label_en !== undefined) {
    const labelEn = input.consumer_label_en.trim();
    if (!labelEn) return { ok: false, error: "类型英文名称不能为空" };
    patch.push({ column: "consumer_label_en", value: labelEn });
  }
  if (input.pros !== undefined) {
    patch.push({ column: "pros", value: input.pros.trim() });
  }
  if (input.usage_tips !== undefined) {
    patch.push({ column: "usage_tips", value: input.usage_tips.trim() });
  }
  if (input.warmth_value !== undefined) {
    const v = Number(input.warmth_value);
    if (!Number.isInteger(v) || v < 0 || v > 100) {
      return { ok: false, error: "保暖值须为 0–100 整数" };
    }
    patch.push({ column: "warmth_value", value: v });
  }
  if (input.is_active !== undefined) {
    patch.push({ column: "is_active", value: input.is_active });
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
      patch.push({ column: key, value: input[key] });
    }
  }

  try {
    const axisChanged = axisKeys.some((key) => input[key] !== undefined);
    if (axisChanged) {
      const row = await queryOne<VariantRow>(
        `SELECT ${VARIANT_SELECT} FROM public.garment_variants WHERE id = $1`,
        [input.id]
      );
      if (!row) return { ok: false, error: "细类型不存在" };
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

      const unique = await assertUniqueAxisTuple(tuple, input.id);
      if (!unique.ok) return unique;
    }

    if (patch.length === 0) return { ok: false, error: "没有可更新的字段" };
    const values = patch.map((entry) => entry.value);
    const assignments = patch.map((entry, index) => `${entry.column} = $${index + 1}`);
    const data = await queryOne<VariantRow>(
      `UPDATE public.garment_variants
          SET ${assignments.join(", ")}, updated_at = now()
        WHERE id = $${values.length + 1}
        RETURNING ${VARIANT_SELECT}`,
      [...values, input.id]
    );
    if (!data) return { ok: false, error: "细类型不存在" };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapVariant(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export type { CreateVariantInput, UpdateVariantInput };
