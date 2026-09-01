import { useCallback, useEffect, useState } from "react";
import { type ClothingFitType } from "@/lib/clothing-weight";

type WarmthPreviewInput = {
  category?: string;
  materialId?: string;
  thickness?: string;
  sizeLabel?: string;
  fitType?: ClothingFitType;
};

type WarmthPreviewResponse = {
  warmth_score?: number;
  weight_grams?: number | null;
  error?: string;
};

export function useWarmthPreview({
  category,
  materialId,
  thickness,
  sizeLabel,
  fitType,
  participatesInWarmth,
}: {
  category: string;
  materialId: string;
  thickness: string;
  sizeLabel: string;
  fitType: ClothingFitType;
  participatesInWarmth: boolean;
}) {
  const [warmthPreview, setWarmthPreview] = useState<number | null>(null);
  const [estimatedWeightGrams, setEstimatedWeightGrams] = useState<number | null>(null);
  const [warmthPreviewLoading, setWarmthPreviewLoading] = useState(false);
  const [warmthPreviewError, setWarmthPreviewError] = useState<string | null>(null);

  const refreshWarmthPreview = useCallback(
    async (overrides: WarmthPreviewInput = {}) => {
      const previewCategory = overrides.category ?? category;
      const previewMaterialId = overrides.materialId ?? materialId;
      const previewThickness = overrides.thickness ?? thickness;
      const previewSizeLabel = overrides.sizeLabel ?? sizeLabel;
      const previewFitType = overrides.fitType ?? fitType;

      if (!previewCategory || !participatesInWarmth) {
        setWarmthPreview(null);
        setEstimatedWeightGrams(null);
        setWarmthPreviewError(null);
        return;
      }
      if (!previewMaterialId || !previewThickness) {
        setWarmthPreview(null);
        setEstimatedWeightGrams(null);
        setWarmthPreviewError(null);
        return;
      }

      setWarmthPreviewLoading(true);
      setWarmthPreviewError(null);

      try {
        const response = await fetch("/api/clothing/preview-warmth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: previewCategory,
            material_id: previewMaterialId,
            thickness: previewThickness,
            size_label: previewSizeLabel || null,
            fit_type: previewFitType,
          }),
        });
        const data = (await response.json()) as WarmthPreviewResponse;

        if (!response.ok) {
          setWarmthPreview(null);
          setEstimatedWeightGrams(null);
          setWarmthPreviewError(data.error ?? "无法计算保暖值");
          return;
        }

        setWarmthPreview(data.warmth_score ?? null);
        setEstimatedWeightGrams(data.weight_grams ?? null);
      } catch {
        setWarmthPreview(null);
        setEstimatedWeightGrams(null);
        setWarmthPreviewError("无法计算保暖值");
      } finally {
        setWarmthPreviewLoading(false);
      }
    },
    [category, materialId, thickness, sizeLabel, fitType, participatesInWarmth]
  );

  useEffect(() => {
    void refreshWarmthPreview();
  }, [refreshWarmthPreview]);

  return {
    warmthPreview,
    estimatedWeightGrams,
    warmthPreviewLoading,
    warmthPreviewError,
    refreshWarmthPreview,
  };
}
