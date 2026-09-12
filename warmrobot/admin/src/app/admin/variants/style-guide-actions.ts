"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type {
  AdminStyleGuide,
  CreateStyleGuideInput,
  UpdateStyleGuideInput,
} from "@/lib/admin/style-guide-types";
import { query, queryOne } from "@/lib/self-hosted/database";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "无权限：需要管理员登录" };
  return { ok: true, data: undefined };
}

type StyleGuideRow = {
  id: string;
  category_id: string;
  category_code: string;
  title: string;
  subtitle: string | null;
  pros: string;
  cons: string;
  usage_tips: string;
  sort_order: number;
  is_active: boolean;
};

function mapRow(row: StyleGuideRow): AdminStyleGuide {
  return {
    id: row.id,
    category_id: row.category_id,
    category_code: row.category_code,
    title: row.title,
    subtitle: row.subtitle,
    pros: row.pros ?? "",
    cons: row.cons ?? "",
    usage_tips: row.usage_tips ?? "",
    sort_order: row.sort_order,
    is_active: row.is_active,
  };
}

const SELECT_COLS =
  "id, category_id, category_code, title, subtitle, pros, cons, usage_tips, sort_order, is_active";

export async function listAdminStyleGuides(
  categoryCode?: string
): Promise<ActionResult<AdminStyleGuide[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const data = await query<StyleGuideRow>(
      `SELECT ${SELECT_COLS}
         FROM public.category_style_guides
        WHERE ($1::text IS NULL OR category_code = $1)
        ORDER BY category_code ASC, sort_order ASC`,
      [categoryCode ?? null]
    );
    return { ok: true, data: data.map(mapRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载失败" };
  }
}

export async function createStyleGuide(
  input: CreateStyleGuideInput
): Promise<ActionResult<AdminStyleGuide>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const title = input.title.trim();
  if (!title) return { ok: false, error: "标题不能为空" };

  try {
    const data = await queryOne<StyleGuideRow>(
      `INSERT INTO public.category_style_guides
        (category_id, category_code, title, subtitle, pros, cons, usage_tips, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING ${SELECT_COLS}`,
      [
        input.category_id,
        input.category_code,
        title,
        input.subtitle?.trim() || null,
        input.pros?.trim() ?? "",
        input.cons?.trim() ?? "",
        input.usage_tips?.trim() ?? "",
        input.sort_order ?? 0,
      ]
    );
    if (!data) return { ok: false, error: "创建失败" };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapRow(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateStyleGuide(
  input: UpdateStyleGuideInput
): Promise<ActionResult<AdminStyleGuide>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const patch: Array<{ column: string; value: unknown }> = [];
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "标题不能为空" };
    patch.push({ column: "title", value: title });
  }
  if (input.subtitle !== undefined) {
    patch.push({ column: "subtitle", value: input.subtitle?.trim() || null });
  }
  if (input.pros !== undefined) patch.push({ column: "pros", value: input.pros.trim() });
  if (input.cons !== undefined) patch.push({ column: "cons", value: input.cons.trim() });
  if (input.usage_tips !== undefined) patch.push({ column: "usage_tips", value: input.usage_tips.trim() });
  if (input.sort_order !== undefined) patch.push({ column: "sort_order", value: input.sort_order });
  if (input.is_active !== undefined) patch.push({ column: "is_active", value: input.is_active });

  if (patch.length === 0) {
    return { ok: false, error: "没有可更新的字段" };
  }

  try {
    const values = patch.map((entry) => entry.value);
    const assignments = patch.map((entry, index) => `${entry.column} = $${index + 1}`);
    const data = await queryOne<StyleGuideRow>(
      `UPDATE public.category_style_guides
          SET ${assignments.join(", ")}, updated_at = now()
        WHERE id = $${values.length + 1}
        RETURNING ${SELECT_COLS}`,
      [...values, input.id]
    );
    if (!data) return { ok: false, error: "款式说明不存在" };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapRow(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteStyleGuide(
  id: string
): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    await query("DELETE FROM public.category_style_guides WHERE id = $1", [id]);
    revalidatePath("/admin/variants");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}
