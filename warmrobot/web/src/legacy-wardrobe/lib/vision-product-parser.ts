import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import { ALL_CLOTHING_CATEGORIES, normalizeCategoryCode } from "@/lib/clothing-categories";
import {
  callVisionJson,
  getVisionConfig,
  visionSetupHint,
} from "@/legacy-wardrobe/lib/multimodal-vision";
import {
  inferCategoryFromTitle,
  inferThicknessFromTitle,
} from "@/legacy-wardrobe/lib/product-parse-inference";
import type { ParsedProductDraft } from "@/legacy-wardrobe/lib/product-parse-types";

const VALID_THICKNESS = new Set<ThicknessLevel>(["thin", "medium", "thick"]);

type VisionModelJson = {
  name?: string;
  category?: string;
  thickness?: string;
  size_label?: string;
  price_text?: string;
  material_hint?: string;
  warnings?: string[];
};

function parseModelJson(text: string): VisionModelJson | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate) as VisionModelJson;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as VisionModelJson;
      } catch {
        return null;
      }
    }
    return null;
  }
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

export async function extractProductFromScreenshot(
  imageBase64: string,
  mimeType: string,
  linkedUrl?: string | null
): Promise<ParsedProductDraft> {
  if (!getVisionConfig()) {
    throw new Error(
      `${visionSetupHint()} 也可改用淘宝分享文案（含「商品名」）解析。`
    );
  }

  const content = await callVisionJson({
    systemPrompt: `你是婴儿服装商品信息提取助手。根据电商商品页截图，提取字段并只输出 JSON，不要 markdown。category 只能是 ${ALL_CLOTHING_CATEGORIES.join(", ")}。thickness 只能是 thin, medium, thick。`,
    userText:
      '分析这张淘宝/天猫/京东等平台婴儿服装商品页截图，返回 JSON：{"name":"商品全称","category":"...","thickness":"...","price_text":"如¥99","material_hint":"材质关键词","warnings":["不确定时的说明"]}。不要返回尺码，尺码由系统根据宝宝年龄推荐。',
    imageBase64,
    mimeType,
  });

  const parsed = parseModelJson(content);
  if (!parsed?.name?.trim()) {
    throw new Error("未能从截图中识别商品名称，请换一张包含标题区域的清晰截图。");
  }

  const name = parsed.name.trim();
  const category = normalizeCategory(parsed.category, name);
  const thickness = normalizeThickness(parsed.thickness, name);

  return {
    platform: "screenshot",
    itemId: null,
    canonicalUrl: linkedUrl?.trim() || "",
    name,
    category,
    thickness,
    sizeLabel: null,
    imageUrl: null,
    priceText: parsed.price_text?.trim() || null,
    materialHint: parsed.material_hint?.trim() || name,
    source: "screenshot",
    warnings: [...(parsed.warnings ?? []), "信息来自截图识别，请核对后保存。"],
  };
}
