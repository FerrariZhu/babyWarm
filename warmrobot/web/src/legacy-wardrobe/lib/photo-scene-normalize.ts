import type { PhotoScene, PhotoSceneResult } from "@/legacy-wardrobe/lib/photo-scene-types";

const VALID_SCENES = new Set<PhotoScene>([
  "product_screenshot",
  "physical_wardrobe",
  "ambiguous",
]);

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

function normalizeScene(value: unknown): PhotoScene {
  if (typeof value === "string" && VALID_SCENES.has(value as PhotoScene)) {
    return value as PhotoScene;
  }
  return "ambiguous";
}

export function normalizePhotoSceneJson(parsed: Record<string, unknown>): PhotoSceneResult {
  const hints = Array.isArray(parsed.hints)
    ? parsed.hints.filter((hint): hint is string => typeof hint === "string")
    : [];

  return {
    scene: normalizeScene(parsed.scene),
    confidence: clampConfidence(parsed.confidence),
    hints,
  };
}
