"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  isValidCategoryCode,
  type AdminCategory,
  type CategoryProductLink,
  type OutfitSlot,
} from "@/lib/admin/category-types";
import { clientQuery, query, queryOne, transaction } from "@/lib/self-hosted/database";

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

const CATEGORY_SELECT =
  "id, code, name_zh, name_en, outfit_slot, warmth_min, warmth_max, icon_key, icon_url, sort_order, is_active";
const LINK_SELECT = "id, category_id, url, title, sort_order, is_active";
const CATEGORY_ICON_MAX_BYTES = 2 * 1024 * 1024;
function categoryIconDirectory() {
  const root = process.env.GUIDE_ASSET_DIR?.trim() || "/var/lib/warmrobot/guide-assets";
  return path.join(root, "category-icons");
}

function publicWebUrl() {
  return (process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

function verifiedImageType(bytes: Uint8Array): { mimeType: string; extension: string } | null {
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  return null;
}

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
    const [rows, links] = await Promise.all([
      query<CategoryRow>(`SELECT ${CATEGORY_SELECT} FROM public.categories ORDER BY sort_order ASC`),
      query<LinkRow>(`SELECT ${LINK_SELECT} FROM public.category_product_links ORDER BY sort_order ASC`),
    ]);
    const list = rows.map((row) => mapCategory(row, links));
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
    const warmthMid = Math.round((input.warmth_min + input.warmth_max) / 2);
    const data = await transaction(async (client) => {
      const maxSort = (await clientQuery<{ sort_order: number }>(
        client,
        "SELECT sort_order FROM public.categories ORDER BY sort_order DESC LIMIT 1"
      ))[0];
      const rows = await clientQuery<CategoryRow>(
        client,
        `INSERT INTO public.categories
          (code, name_zh, name_en, outfit_slot, warmth_min, warmth_max, icon_key, icon_url,
           sort_order, is_active, layer_order, coverage_multiplier, warmth_bonus)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 1, 1, 0)
         RETURNING ${CATEGORY_SELECT}`,
        [code, name_zh, name_en, input.outfit_slot, input.warmth_min, input.warmth_max,
          input.icon_key?.trim() || null, input.icon_url?.trim() || null, (maxSort?.sort_order ?? 0) + 1]
      );
      const category = rows[0];
      if (!category) throw new Error("创建品类失败");
      await client.query(
        `INSERT INTO public.garment_variants
          (category_id, category_code, material, fill_type, thickness, fit_type,
           bodysuit_style, pant_length, sock_height, warmth_value, admin_label,
           consumer_label, consumer_label_en, consumer_tags, is_active, sort_order)
         VALUES ($1, $2, NULL, NULL, NULL, 'regular', NULL, NULL, NULL, $3, $4, $4, $5, $6, true, 0)`,
        [category.id, code, warmthMid, name_zh, name_en || name_zh, []]
      );
      return category;
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin/variants");
    return { ok: true, data: mapCategory(data, []) };
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

  const patch: Array<{ column: string; value: unknown }> = [];
  if (input.name_zh !== undefined) {
    const name_zh = input.name_zh.trim();
    if (!name_zh) return { ok: false, error: "中文名称不能为空" };
    patch.push({ column: "name_zh", value: name_zh });
  }
  if (input.name_en !== undefined) {
    patch.push({ column: "name_en", value: input.name_en?.trim() || null });
  }
  if (input.outfit_slot !== undefined) {
    if (!input.outfit_slot) return { ok: false, error: "必须选择穿搭槽位" };
    patch.push({ column: "outfit_slot", value: input.outfit_slot });
  }
  if (input.warmth_min !== undefined) patch.push({ column: "warmth_min", value: input.warmth_min });
  if (input.warmth_max !== undefined) patch.push({ column: "warmth_max", value: input.warmth_max });
  if (input.icon_key !== undefined) patch.push({ column: "icon_key", value: input.icon_key?.trim() || null });
  if (input.icon_url !== undefined) patch.push({ column: "icon_url", value: input.icon_url?.trim() || null });
  if (input.is_active !== undefined) patch.push({ column: "is_active", value: input.is_active });

  if (patch.length === 0) {
    return { ok: false, error: "无更新字段" };
  }

  try {
    const warmthMinPatch = patch.find((entry) => entry.column === "warmth_min")?.value;
    const warmthMaxPatch = patch.find((entry) => entry.column === "warmth_max")?.value;
    if (warmthMinPatch !== undefined || warmthMaxPatch !== undefined) {
      const current = await queryOne<{ warmth_min: number; warmth_max: number }>(
        "SELECT warmth_min, warmth_max FROM public.categories WHERE id = $1",
        [input.id]
      );
      if (!current) return { ok: false, error: "品类不存在" };
      const min = Number(warmthMinPatch ?? current.warmth_min);
      const max = Number(warmthMaxPatch ?? current.warmth_max);
      if (min < 0 || max > 100 || min > max) {
        return { ok: false, error: "保温区间须在 0–100 且 min ≤ max" };
      }
    }

    const values = patch.map((entry) => entry.value);
    const assignments = patch.map((entry, index) => `${entry.column} = $${index + 1}`);
    const data = await queryOne<CategoryRow>(
      `UPDATE public.categories
          SET ${assignments.join(", ")}, updated_at = now()
        WHERE id = $${values.length + 1}
        RETURNING ${CATEGORY_SELECT}`,
      [...values, input.id]
    );
    if (!data) return { ok: false, error: "品类不存在" };
    const links = await query<LinkRow>(
      `SELECT ${LINK_SELECT} FROM public.category_product_links WHERE category_id = $1 ORDER BY sort_order ASC`,
      [input.id]
    );

    revalidatePath("/admin/categories");
    revalidatePath("/admin/variants");
    return {
      ok: true,
      data: mapCategory(data, links),
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
    const maxSort = await queryOne<{ sort_order: number }>(
      "SELECT sort_order FROM public.category_product_links WHERE category_id = $1 ORDER BY sort_order DESC LIMIT 1",
      [categoryId]
    );
    const data = await queryOne<LinkRow>(
      `INSERT INTO public.category_product_links (category_id, url, title, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING ${LINK_SELECT}`,
      [categoryId, trimmed, title?.trim() || null, (maxSort?.sort_order ?? 0) + 1]
    );
    if (!data) return { ok: false, error: "添加失败" };

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
    await query("DELETE FROM public.category_product_links WHERE id = $1", [linkId]);
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
  if (file.size > CATEGORY_ICON_MAX_BYTES) {
    return { ok: false, error: "图片须小于 2MB" };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = verifiedImageType(bytes);
    if (!detected || detected.mimeType !== file.type) {
      return { ok: false, error: "仅支持内容有效的 WebP、PNG 或 JPEG 图片" };
    }
    const storagePath = `${categoryId}/${randomUUID()}.${detected.extension}`;
    const filePath = path.join(categoryIconDirectory(), storagePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes, { flag: "wx" });

    const icon_url = `${publicWebUrl()}/api/category-icons/${storagePath}`;
    try {
      const updated = await queryOne<{ id: string }>(
        "UPDATE public.categories SET icon_url = $1, updated_at = now() WHERE id = $2 RETURNING id",
        [icon_url, categoryId]
      );
      if (!updated) throw new Error("品类不存在");
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }

    revalidatePath("/admin/categories");
    return { ok: true, data: { icon_url } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "上传失败" };
  }
}
