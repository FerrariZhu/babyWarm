"use server";

import { revalidatePath } from "next/cache";
import { mapCategoryGuideRow, type CategoryGuideContent } from "@warmrobot/core/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";

export type CategoryGuideActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type CategoryGuideRow = {
  category_code: string;
  intro: string;
  style_guides: unknown[] | null;
  material_guides: unknown[] | null;
};

function mapGuide(row: CategoryGuideRow): CategoryGuideContent {
  return mapCategoryGuideRow(row);
}

function trimEntries(entries: CategoryGuideContent["styles"]) {
  return entries.map((entry, index) => ({
    ...entry,
    label: entry.label.trim(),
    pros: entry.pros.map((item) => item.trim()).filter(Boolean).slice(0, 2),
    cautions: entry.cautions.map((item) => item.trim()).filter(Boolean).slice(0, 2),
    sortOrder: index,
  }));
}

function isValidGuide(guide: CategoryGuideContent): string | null {
  const intro = guide.intro.trim();
  if (!intro) return "请填写品类科普";
  if (intro.length > 100) return "品类科普不能超过 100 字";
  const entries = [...guide.styles, ...guide.materials];
  if (entries.some((entry) => !entry.label.trim())) return "款式和材质名称不能为空";
  if (entries.some((entry) => entry.pros.length > 2 || entry.cautions.length > 2)) {
    return "每项优点和注意事项最多两条";
  }
  return null;
}

function guideEntriesForStorage(entries: CategoryGuideContent["styles"]) {
  return entries.map(({ axis, value, label, pros, cautions }) => ({
    axis,
    value,
    name: label,
    pros,
    cautions,
  }));
}

export async function listAdminCategoryGuides(): Promise<
  CategoryGuideActionResult<CategoryGuideContent[]>
> {
  if (!(await requireAdmin())) return { ok: false, error: "无权限：需要管理员登录" };
  try {
    const { data, error } = await createServiceClient()
      .from("category_guide_contents")
      .select("category_code, intro, style_guides, material_guides")
      .order("category_code", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data as CategoryGuideRow[]).map(mapGuide) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "加载失败" };
  }
}

export async function saveAdminCategoryGuide(
  guide: CategoryGuideContent
): Promise<CategoryGuideActionResult<CategoryGuideContent>> {
  if (!(await requireAdmin())) return { ok: false, error: "无权限：需要管理员登录" };
  const normalized: CategoryGuideContent = {
    ...guide,
    intro: guide.intro.trim(),
    styles: trimEntries(guide.styles),
    materials: trimEntries(guide.materials),
  };
  const validationError = isValidGuide(normalized);
  if (validationError) return { ok: false, error: validationError };

  try {
    const { data, error } = await createServiceClient()
      .from("category_guide_contents")
      .upsert(
        {
          category_code: normalized.categoryCode,
          intro: normalized.intro,
          style_guides: guideEntriesForStorage(normalized.styles),
          material_guides: guideEntriesForStorage(normalized.materials),
        },
        { onConflict: "category_code" }
      )
      .select("category_code, intro, style_guides, material_guides")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/variants");
    revalidatePath("/");
    return { ok: true, data: mapGuide(data as CategoryGuideRow) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "保存失败" };
  }
}
