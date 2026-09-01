"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type {
  AdminStyleGuide,
  CreateStyleGuideInput,
  UpdateStyleGuideInput,
} from "@/lib/admin/style-guide-types";
import { createServiceClient } from "@/lib/supabase/service";

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
    const supabase = createServiceClient();
    let query = supabase
      .from("category_style_guides")
      .select(SELECT_COLS)
      .order("category_code", { ascending: true })
      .order("sort_order", { ascending: true });

    if (categoryCode) {
      query = query.eq("category_code", categoryCode);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data as StyleGuideRow[]).map(mapRow) };
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
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("category_style_guides")
      .insert({
        category_id: input.category_id,
        category_code: input.category_code,
        title,
        subtitle: input.subtitle?.trim() || null,
        pros: input.pros?.trim() ?? "",
        cons: input.cons?.trim() ?? "",
        usage_tips: input.usage_tips?.trim() ?? "",
        sort_order: input.sort_order ?? 0,
        is_active: true,
      })
      .select(SELECT_COLS)
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapRow(data as StyleGuideRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateStyleGuide(
  input: UpdateStyleGuideInput
): Promise<ActionResult<AdminStyleGuide>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "标题不能为空" };
    patch.title = title;
  }
  if (input.subtitle !== undefined) {
    patch.subtitle = input.subtitle?.trim() || null;
  }
  if (input.pros !== undefined) patch.pros = input.pros.trim();
  if (input.cons !== undefined) patch.cons = input.cons.trim();
  if (input.usage_tips !== undefined) patch.usage_tips = input.usage_tips.trim();
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "没有可更新的字段" };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("category_style_guides")
      .update(patch)
      .eq("id", input.id)
      .select(SELECT_COLS)
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    return { ok: true, data: mapRow(data as StyleGuideRow) };
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
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("category_style_guides")
      .delete()
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}
