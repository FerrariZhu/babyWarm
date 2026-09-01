"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  isValidCategoryCode,
  type AdminCategory,
  type CategoryProductLink,
  type OutfitSlot,
} from "@/lib/admin/category-types";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, error: "无权限：需要管理员登录（ADMIN_EMAILS）" };
  }
  return { ok: true, data: undefined };
}

type CategoryRow = {
  id: string;
  code: string;
  name_zh: string;
  name_en: string | null;
  outfit_slot: string | null;
  warmth_min: number;
  warmth_max: number;
  icon_key: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type LinkRow = {
  id: string;
  category_id: string;
  url: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
};

function mapCategory(row: CategoryRow, links: LinkRow[]): AdminCategory {
  return {
    id: row.id,
    code: row.code,
    name_zh: row.name_zh,
    name_en: row.name_en,
    outfit_slot: (row.outfit_slot ?? "other") as OutfitSlot,
    warmth_min: Number(row.warmth_min),
    warmth_max: Number(row.warmth_max),
    icon_key: row.icon_key,
    icon_url: row.icon_url,
    sort_order: row.sort_order,
    is_active: row.is_active,
    product_links: links
      .filter((l) => l.category_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (l): CategoryProductLink => ({
          id: l.id,
          url: l.url,
          title: l.title,
          sort_order: l.sort_order,
          is_active: l.is_active,
        })
      ),
  };
}

export async function listAdminCategories(): Promise<ActionResult<AdminCategory[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("categories")
      .select(
        "id, code, name_zh, name_en, outfit_slot, warmth_min, warmth_max, icon_key, icon_url, sort_order, is_active"
      )
      .order("sort_order", { ascending: true });

    if (error) return { ok: false, error: error.message };

    const { data: links, error: linkError } = await supabase
      .from("category_product_links")
      .select("id, category_id, url, title, sort_order, is_active")
      .order("sort_order", { ascending: true });

    if (linkError) return { ok: false, error: linkError.message };

    const list = (rows as CategoryRow[]).map((row) =>
      mapCategory(row, (links as LinkRow[]) ?? [])
    );
    return { ok: true, data: list };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载失败" };
  }
}

export type CreateCategoryInput = {
  code: string;
  name_zh: string;
  name_en?: string | null;
  outfit_slot: OutfitSlot;
  warmth_min: number;
  warmth_max: number;
  icon_key?: string | null;
  icon_url?: string | null;
};

export async function createCategory(
  input: CreateCategoryInput
): Promise<ActionResult<AdminCategory>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const code = input.code.trim().toLowerCase();
  const name_zh = input.name_zh.trim();
  const name_en = input.name_en?.trim() || null;
  if (!isValidCategoryCode(code)) {
    return {
      ok: false,
      error: "code 须为小写字母开头的 snake_case（如 tshirt_short）",
    };
  }
  if (!name_zh) return { ok: false, error: "中文名称不能为空" };
  if (!input.outfit_slot) return { ok: false, error: "必须选择穿搭槽位" };
  if (input.warmth_min < 0 || input.warmth_max > 100 || input.warmth_min > input.warmth_max) {
    return { ok: false, error: "保温区间须在 0–100 且 min ≤ max" };
  }

  try {
    const supabase = createServiceClient();
    const { data: maxSort } = await supabase
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxSort?.sort_order ?? 0) + 1;
    const warmthMid = Math.round((input.warmth_min + input.warmth_max) / 2);

    const { data, error } = await supabase
      .from("categories")
      .insert({
        code,
        name_zh,
        name_en,
        outfit_slot: input.outfit_slot,
        warmth_min: input.warmth_min,
        warmth_max: input.warmth_max,
        icon_key: input.icon_key?.trim() || null,
        icon_url: input.icon_url?.trim() || null,
        sort_order,
        is_active: true,
        layer_order: 1,
        coverage_multiplier: 1,
        warmth_bonus: 0,
      })
      .select(
        "id, code, name_zh, name_en, outfit_slot, warmth_min, warmth_max, icon_key, icon_url, sort_order, is_active"
      )
      .single();

    if (error) return { ok: false, error: error.message };

    // Seed one default garment variant so the category appears in 细类型清单
    const { error: variantError } = await supabase.from("garment_variants").insert({
      category_id: data.id,
      category_code: code,
      material: null,
      fill_type: null,
      thickness: null,
      fit_type: "regular",
      bodysuit_style: null,
      pant_length: null,
      sock_height: null,
      warmth_value: warmthMid,
      admin_label: name_zh,
      consumer_label: name_zh,
      consumer_label_en: name_en?.trim() || name_zh,
      consumer_tags: [],
      is_active: true,
      sort_order: 0,
    });

    if (variantError) {
      // Roll back category if seed fails
      await supabase.from("categories").delete().eq("id", data.id);
      return { ok: false, error: `品类已创建但细类型种子失败：${variantError.message}` };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/admin/variants");
    return { ok: true, data: mapCategory(data as CategoryRow, []) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export type UpdateCategoryInput = {
  id: string;
  name_zh?: string;
  name_en?: string | null;
  outfit_slot?: OutfitSlot;
  warmth_min?: number;
  warmth_max?: number;
  icon_key?: string | null;
  icon_url?: string | null;
  is_active?: boolean;
};

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<ActionResult<AdminCategory>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const patch: Record<string, unknown> = {};
  if (input.name_zh !== undefined) {
    const name_zh = input.name_zh.trim();
    if (!name_zh) return { ok: false, error: "中文名称不能为空" };
    patch.name_zh = name_zh;
  }
  if (input.name_en !== undefined) {
    patch.name_en = input.name_en?.trim() || null;
  }
  if (input.outfit_slot !== undefined) {
    if (!input.outfit_slot) return { ok: false, error: "必须选择穿搭槽位" };
    patch.outfit_slot = input.outfit_slot;
  }
  if (input.warmth_min !== undefined) patch.warmth_min = input.warmth_min;
  if (input.warmth_max !== undefined) patch.warmth_max = input.warmth_max;
  if (input.icon_key !== undefined) patch.icon_key = input.icon_key?.trim() || null;
  if (input.icon_url !== undefined) patch.icon_url = input.icon_url?.trim() || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "无更新字段" };
  }

  try {
    const supabase = createServiceClient();

    if (patch.warmth_min !== undefined || patch.warmth_max !== undefined) {
      const { data: current } = await supabase
        .from("categories")
        .select("warmth_min, warmth_max")
        .eq("id", input.id)
        .single();
      if (!current) return { ok: false, error: "品类不存在" };
      const min = Number(patch.warmth_min ?? current.warmth_min);
      const max = Number(patch.warmth_max ?? current.warmth_max);
      if (min < 0 || max > 100 || min > max) {
        return { ok: false, error: "保温区间须在 0–100 且 min ≤ max" };
      }
    }

    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", input.id)
      .select(
        "id, code, name_zh, name_en, outfit_slot, warmth_min, warmth_max, icon_key, icon_url, sort_order, is_active"
      )
      .single();

    if (error) return { ok: false, error: error.message };

    const { data: links } = await supabase
      .from("category_product_links")
      .select("id, category_id, url, title, sort_order, is_active")
      .eq("category_id", input.id);

    revalidatePath("/admin/categories");
    revalidatePath("/admin/variants");
    return {
      ok: true,
      data: mapCategory(data as CategoryRow, (links as LinkRow[]) ?? []),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function setCategoryActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<AdminCategory>> {
  return updateCategory({ id, is_active });
}

export async function addProductLink(
  categoryId: string,
  url: string,
  title?: string
): Promise<ActionResult<CategoryProductLink>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "链接不能为空" };
  try {
    // Validate absolute URL
    void new URL(trimmed);
  } catch {
    return { ok: false, error: "请输入有效 URL（含 https://）" };
  }

  try {
    const supabase = createServiceClient();
    const { data: maxSort } = await supabase
      .from("category_product_links")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("category_product_links")
      .insert({
        category_id: categoryId,
        url: trimmed,
        title: title?.trim() || null,
        sort_order: (maxSort?.sort_order ?? 0) + 1,
        is_active: true,
      })
      .select("id, url, title, sort_order, is_active")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/categories");
    return {
      ok: true,
      data: {
        id: data.id,
        url: data.url,
        title: data.title,
        sort_order: data.sort_order,
        is_active: data.is_active,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function removeProductLink(linkId: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("category_product_links")
      .delete()
      .eq("id", linkId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function uploadCategoryIcon(
  categoryId: string,
  formData: FormData
): Promise<ActionResult<{ icon_url: string }>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "请选择图片文件" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "图片须小于 2MB" };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : "jpg";

  try {
    const supabase = createServiceClient();
    const path = `${categoryId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("category-icons")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data: pub } = supabase.storage.from("category-icons").getPublicUrl(path);
    const icon_url = pub.publicUrl;

    const { error } = await supabase
      .from("categories")
      .update({ icon_url })
      .eq("id", categoryId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/categories");
    return { ok: true, data: { icon_url } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "上传失败" };
  }
}
