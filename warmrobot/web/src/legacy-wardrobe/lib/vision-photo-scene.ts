import {
  callVisionJson,
  getVisionConfig,
  visionSetupHint,
} from "@/legacy-wardrobe/lib/multimodal-vision";
import type { PhotoSceneResult } from "@/legacy-wardrobe/lib/photo-scene-types";
import { normalizePhotoSceneJson } from "@/legacy-wardrobe/lib/photo-scene-normalize";

export type { PhotoScene, PhotoSceneResult } from "@/legacy-wardrobe/lib/photo-scene-types";
export {
  SCENE_CONFIDENCE_THRESHOLD,
  shouldDisambiguateScene,
} from "@/legacy-wardrobe/lib/photo-scene-types";

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

export async function classifyPhotoScene(
  imageBase64: string,
  mimeType: string
): Promise<PhotoSceneResult> {
  if (!getVisionConfig()) {
    throw new Error(visionSetupHint());
  }

  const content = await callVisionJson({
    systemPrompt: `你是图片场景分类助手。判断用户上传的婴儿服装相关图片属于哪一类，只输出 JSON，不要 markdown。
scene 只能是以下三者之一：
- product_screenshot：电商商品详情页/列表页截图（含价格、购买按钮、店铺名、商品标题等 UI）
- physical_wardrobe：真实衣柜/抽屉/床面/桌面上的实物衣物照片（平铺或挂放，无电商 UI）
- ambiguous：无法明确区分，或同时具有两类特征
confidence 为 0-1 的小数，表示分类把握。
hints 为简短中文说明数组（可选，最多 2 条）。
输出格式：{"scene":"...","confidence":0.9,"hints":["..."]}`,
    userText: "这张图片是电商商品页截图，还是真实衣柜/平铺实物照片？",
    imageBase64,
    mimeType,
  });

  const parsed = parseModelJson(content);
  if (!parsed) {
    return { scene: "ambiguous", confidence: 0, hints: ["场景分类返回格式无效"] };
  }

  return normalizePhotoSceneJson(parsed);
}
