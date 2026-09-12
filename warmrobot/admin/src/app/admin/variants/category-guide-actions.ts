"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  CATEGORY_GUIDE_VISUAL_AXIS,
  CATEGORY_GUIDE_VISUAL_VALUE,
  mapCategoryGuideRow,
  type CategoryGuideContent,
} from "@warmrobot/core/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { query, queryOne } from "@/lib/self-hosted/database";

export type CategoryGuideActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type CategoryGuideRow = {
  category_code: string;
  intro: string;
  style_guides: unknown[] | null;
  material_guides: unknown[] | null;
};

const MAX_GUIDE_VISUAL_ASSET_BYTES = 2 * 1024 * 1024;
const GUIDE_AXIS_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const GUIDE_VALUE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const GUIDE_CATEGORY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/webp", "webp"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
]);

function guideAssetDirectory() {
  return process.env.GUIDE_ASSET_DIR?.trim() || "/var/lib/warmrobot/guide-assets";
}

export type GuideVisualAsset = {
  id: string;
  categoryCode: string;
  axis: string;
  value: string;
  storagePath: string;
  altText: string;
  status: "draft" | "approved";
  mimeType: "image/webp" | "image/png" | "image/jpeg";
  byteSize: number;
  createdAt: string;
  updatedAt: string;
};

type GuideVisualAssetRow = {
  id: string;
  category_code: string;
  axis: string;
  value: string;
  storage_path: string;
  alt_text: string;
  status: "draft" | "approved";
  mime_type: "image/webp" | "image/png" | "image/jpeg";
  byte_size: number;
  created_at: string | Date;
  updated_at: string | Date;
};

export type UploadGuideVisualAssetInput = {
  categoryCode: string;
  axis: string;
  value: string;
  altText: string;
  status?: "draft" | "approved";
  file: File;
};

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapGuideVisualAsset(row: GuideVisualAssetRow): GuideVisualAsset {
  return {
    id: row.id,
    categoryCode: row.category_code,
    axis: row.axis,
    value: row.value,
    storagePath: row.storage_path,
    altText: row.alt_text,
    status: row.status,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

function isPng(bytes: Uint8Array) {
  return bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array) {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function verifiedImageType(bytes: Uint8Array): "image/webp" | "image/png" | "image/jpeg" | null {
  if (isWebp(bytes)) return "image/webp";
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  return null;
}

function fileExtension(fileName: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

function validateVisualAssetFields(input: UploadGuideVisualAssetInput): string | null {
  if (!GUIDE_CATEGORY_PATTERN.test(input.categoryCode)) return "品类编码格式不正确";
  if (!GUIDE_AXIS_PATTERN.test(input.axis)) return "款式维度格式不正确";
  if (!GUIDE_VALUE_PATTERN.test(input.value)) return "款式取值格式不正确";
  if (!input.altText.trim() || input.altText.trim().length > 180) return "图片替代文本需为 1–180 个字符";
  if (input.status !== undefined && input.status !== "draft" && input.status !== "approved") {
    return "图片状态不正确";
  }
  if (!(input.file instanceof File)) return "请选择图片文件";
  if (input.file.size <= 0 || input.file.size > MAX_GUIDE_VISUAL_ASSET_BYTES) {
    return "图片大小需在 2MB 以内";
  }
  const extension = fileExtension(input.file.name);
  const expectedExtension = ALLOWED_IMAGE_TYPES.get(input.file.type);
  if (!expectedExtension || !extension || ![expectedExtension, expectedExtension === "jpg" ? "jpeg" : expectedExtension].includes(extension)) {
    return "仅支持 WebP、PNG 或 JPEG 图片";
  }
  return null;
}

async function isKnownGuideVisualTarget(categoryCode: string, axis: string, value: string) {
  const data = await queryOne<{ style_guides: unknown }>(
    "SELECT style_guides FROM public.category_guide_contents WHERE category_code = $1",
    [categoryCode]
  );
  if (!data) return false;
  if (axis === CATEGORY_GUIDE_VISUAL_AXIS && value === CATEGORY_GUIDE_VISUAL_VALUE) {
    return true;
  }
  if (!Array.isArray(data.style_guides)) return false;
  return data.style_guides.some((entry) =>
    typeof entry === "object" && entry !== null &&
    (entry as { axis?: unknown }).axis === axis &&
    (entry as { value?: unknown }).value === value
  );
}

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
    const data = await query<CategoryGuideRow>(
      "SELECT category_code, intro, style_guides, material_guides FROM public.category_guide_contents ORDER BY category_code ASC"
    );
    return { ok: true, data: data.map(mapGuide) };
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
    const data = await queryOne<CategoryGuideRow>(
      `INSERT INTO public.category_guide_contents (category_code, intro, style_guides, material_guides)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       ON CONFLICT (category_code) DO UPDATE SET
         intro = EXCLUDED.intro,
         style_guides = EXCLUDED.style_guides,
         material_guides = EXCLUDED.material_guides,
         updated_at = now()
       RETURNING category_code, intro, style_guides, material_guides`,
      [
        normalized.categoryCode,
        normalized.intro,
        JSON.stringify(guideEntriesForStorage(normalized.styles)),
        JSON.stringify(guideEntriesForStorage(normalized.materials)),
      ]
    );
    if (!data) return { ok: false, error: "保存失败" };
    revalidatePath("/admin/variants");
    revalidatePath("/");
    return { ok: true, data: mapGuide(data) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "保存失败" };
  }
}

const GUIDE_VISUAL_ASSET_SELECT_COLUMNS =
  "id, category_code, axis, value, storage_path, alt_text, status, mime_type, byte_size, created_at, updated_at";

export async function listAdminGuideVisualAssets(
  categoryCode?: string
): Promise<CategoryGuideActionResult<GuideVisualAsset[]>> {
  if (!(await requireAdmin())) return { ok: false, error: "无权限：需要管理员登录" };
  if (categoryCode !== undefined && !GUIDE_CATEGORY_PATTERN.test(categoryCode)) {
    return { ok: false, error: "品类编码格式不正确" };
  }

  try {
    const data = await query<GuideVisualAssetRow>(
      `SELECT ${GUIDE_VISUAL_ASSET_SELECT_COLUMNS}
       FROM public.guide_visual_assets
       WHERE ($1::text IS NULL OR category_code = $1)
       ORDER BY category_code ASC, axis ASC, value ASC, created_at DESC`,
      [categoryCode ?? null]
    );
    return { ok: true, data: data.map(mapGuideVisualAsset) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "加载图片资产失败" };
  }
}

export async function uploadGuideVisualAsset(
  input: UploadGuideVisualAssetInput
): Promise<CategoryGuideActionResult<GuideVisualAsset>> {
  if (!(await requireAdmin())) return { ok: false, error: "无权限：需要管理员登录" };

  const validationError = validateVisualAssetFields(input);
  if (validationError) return { ok: false, error: validationError };

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_GUIDE_VISUAL_ASSET_BYTES) {
    return { ok: false, error: "图片大小需在 2MB 以内" };
  }
  const detectedType = verifiedImageType(bytes);
  if (!detectedType || detectedType !== input.file.type) {
    return { ok: false, error: "图片内容与文件格式不匹配" };
  }

  try {
    if (!(await isKnownGuideVisualTarget(input.categoryCode, input.axis, input.value))) {
      return { ok: false, error: "该品类下不存在对应的图片位置" };
    }

    const extension = ALLOWED_IMAGE_TYPES.get(detectedType);
    if (!extension) return { ok: false, error: "仅支持 WebP、PNG 或 JPEG 图片" };
    const storagePath = `${input.categoryCode}/${input.axis}/${input.value}/${randomUUID()}.${extension}`;
    const filePath = path.join(guideAssetDirectory(), storagePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes, { flag: "wx" });

    let data: GuideVisualAssetRow | null;
    try {
      data = await queryOne<GuideVisualAssetRow>(
        `INSERT INTO public.guide_visual_assets
          (category_code, axis, value, storage_path, alt_text, status, mime_type, byte_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${GUIDE_VISUAL_ASSET_SELECT_COLUMNS}`,
        [input.categoryCode, input.axis, input.value, storagePath, input.altText.trim(), input.status ?? "draft", detectedType, bytes.byteLength]
      );
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
    if (!data) {
      await unlink(filePath).catch(() => undefined);
      return { ok: false, error: "保存图片资产失败" };
    }

    revalidatePath("/admin/variants");
    revalidatePath("/");
    return { ok: true, data: mapGuideVisualAsset(data) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "上传图片资产失败" };
  }
}
