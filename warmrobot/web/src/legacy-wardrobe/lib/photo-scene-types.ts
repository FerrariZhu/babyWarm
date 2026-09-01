export type PhotoScene = "product_screenshot" | "physical_wardrobe" | "ambiguous";

export type PhotoSceneResult = {
  scene: PhotoScene;
  confidence: number;
  hints: string[];
};

export const SCENE_CONFIDENCE_THRESHOLD = 0.75;

export function shouldDisambiguateScene(result: PhotoSceneResult): boolean {
  return result.scene === "ambiguous" || result.confidence < SCENE_CONFIDENCE_THRESHOLD;
}
