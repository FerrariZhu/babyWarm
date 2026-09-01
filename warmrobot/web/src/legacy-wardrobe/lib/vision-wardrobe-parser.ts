import {
  callVisionJson,
  getVisionConfig,
  visionSetupHint,
} from "@/legacy-wardrobe/lib/multimodal-vision";
import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import { ALL_CLOTHING_CATEGORIES, normalizeCategoryCode } from "@/lib/clothing-categories";
import {
  inferCategoryFromTitle,
  inferThicknessFromTitle,
} from "@/legacy-wardrobe/lib/product-parse-inference";

const VALID_THICKNESS = new Set<ThicknessLevel>(["thin", "medium", "thick"]);

export type RawWardrobeVisionItem = {
  name_guess?: string;
  category?: string;
  thickness?: string;
  material_hint?: string | null;
  confidence?: number;
  region_description?: string | null;
  color_hint?: string | null;
  bounding_box?: { x: number; y: number; w: number; h: number } | null;
  warnings?: string[];
};

export type WardrobeVisionResult = {
  items: RawWardrobeVisionItem[];
  sceneNotes: string | null;
  warnings: string[];
  providerLabel: string;
};

function parseModelJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

function normalizeCategory(value: string | undefined, title: string): ClothingCategory {
  const normalized = normalizeCategoryCode(value);
  if (normalized) return normalized;
  return inferCategoryFromTitle(title);
}

function normalizeThickness(value: string | undefined, title: string): ThicknessLevel {
  if (value && VALID_THICKNESS.has(value as ThicknessLevel)) {
    return value as ThicknessLevel;
  }
  return inferThicknessFromTitle(title);
}

function normalizeBoundingBox(raw: unknown): { x: number; y: number; w: number; h: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const box = raw as Record<string, unknown>;
  const x = Number(box.x);
  const y = Number(box.y);
  const w = Number(box.w ?? box.width);
  const h = Number(box.h ?? box.height);
  if ([x, y, w, h].some((n) => Number.isNaN(n))) return null;
  if (w <= 0 || h <= 0) return null;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    w: Math.min(1, Math.max(0, w)),
    h: Math.min(1, Math.max(0, h)),
  };
}

function normalizeItem(raw: unknown, index: number): RawWardrobeVisionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nameGuess =
    (typeof row.name_guess === "string" && row.name_guess.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    `未命名衣物 ${index + 1}`;

  const category = normalizeCategory(
    typeof row.category === "string" ? row.category : undefined,
    nameGuess
  );
  const thickness = normalizeThickness(
    typeof row.thickness === "string" ? row.thickness : undefined,
    nameGuess
  );

  return {
    name_guess: nameGuess,
    category,
    thickness,
    material_hint:
      typeof row.material_hint === "string" ? row.material_hint.trim() || null : null,
    confidence: clampConfidence(row.confidence),
    region_description:
      typeof row.region_description === "string" ? row.region_description.trim() || null : null,
    color_hint: typeof row.color_hint === "string" ? row.color_hint.trim() || null : null,
    bounding_box: normalizeBoundingBox(row.bounding_box),
    warnings: Array.isArray(row.warnings)
      ? row.warnings.filter((w): w is string => typeof w === "string")
      : [],
  };
}

export function buildWardrobeVisionPrompt(): string {
  return `你是婴儿服装衣柜识别助手。用户上传的是真实衣柜/抽屉/床面平铺照片（不是电商截图）。
请识别照片中每一件独立的婴儿服装，尽量分开计数（即使部分重叠）。
只输出 JSON，不要 markdown。category 只能是：${ALL_CLOTHING_CATEGORIES.join(", ")}。
thickness 只能是 thin, medium, thick。
confidence 为 0-1 的小数，表示你对该件衣物分类的整体把握。
若看不清材质，material_hint 可写「棉质」等合理猜测并降低 confidence。
输出格式：
{"items":[{"name_guess":"描述性名称","category":"...","thickness":"...","material_hint":"...","confidence":0.8,"region_description":"位置描述","color_hint":"颜色","bounding_box":{"x":0.1,"y":0.2,"w":0.3,"h":0.25},"warnings":[]}],"scene_notes":"拍摄场景说明","warnings":["整体不确定点"]}
bounding_box 为单件衣物主体的紧致外接框（x,y 左上角，w,h 宽高，取值 0-1）。框应紧贴该件衣物轮廓，不要包含床面、其他衣物或大面积背景。`;
}

export async function extractWardrobeItemsFromPhoto(
  imageBase64: string,
  mimeType: string
): Promise<WardrobeVisionResult> {
  const config = getVisionConfig();
  if (!config) {
    throw new Error(visionSetupHint());
  }

  const content = await callVisionJson({
    systemPrompt: buildWardrobeVisionPrompt(),
    userText: "分析这张婴儿衣柜/衣物平铺照片，列出所有可辨认的独立衣物。",
    imageBase64,
    mimeType,
  });

  const parsed = parseModelJson(content);
  if (!parsed) throw new Error("衣柜识别返回格式无效");

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems
    .map((item, index) => normalizeItem(item, index))
    .filter((item): item is RawWardrobeVisionItem => item != null);

  if (items.length === 0) {
    throw new Error("未识别到衣物，请尝试平铺拍摄或换一张更清晰的照片。");
  }

  const sceneNotes =
    typeof parsed.scene_notes === "string" ? parsed.scene_notes.trim() || null : null;
  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((w): w is string => typeof w === "string")
    : [];

  return {
    items,
    sceneNotes,
    warnings,
    providerLabel: `${config.provider}:${config.model}`,
  };
}
