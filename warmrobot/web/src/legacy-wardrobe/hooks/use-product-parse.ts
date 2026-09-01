import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DbSizeLabel } from "@/lib/db/types";
import { normalizeCategoryCode } from "@/lib/clothing-categories";
import { saveWardrobeScanSession } from "@/legacy-wardrobe/lib/photo-recognize-session";
import type { ProductParseApiResponse } from "@/legacy-wardrobe/lib/product-parse-pipeline";
import type { PhotoScene } from "@/legacy-wardrobe/lib/photo-scene-types";
import {
  SCENE_CONFIDENCE_THRESHOLD,
  shouldDisambiguateScene,
} from "@/legacy-wardrobe/lib/photo-scene-types";
import type { WardrobeScanApiResponse } from "@/legacy-wardrobe/lib/wardrobe-scan-types";
import type { ClothingFormState } from "@/legacy-wardrobe/hooks/use-clothing-form-state";

export type ProductParseApiData = ProductParseApiResponse & { error?: string };

export type PhotoDisambiguation = {
  file: File;
  previewUrl: string;
  hints: string[];
};

type UseProductParseOptions = {
  url: string;
  sizes: DbSizeLabel[];
  form: Pick<
    ClothingFormState,
    | "category"
    | "materialId"
    | "thickness"
    | "sizeLabel"
    | "setName"
    | "setCategory"
    | "setMaterialId"
    | "setThickness"
    | "setSizeLabel"
    | "markSizeManuallySet"
  >;
  refreshWarmthPreview: (overrides?: {
    category?: string;
    materialId?: string;
    thickness?: string;
    sizeLabel?: string;
  }) => Promise<void>;
  onError: (message: string) => void;
};

export function useProductParse({
  url,
  sizes,
  form,
  refreshWarmthPreview,
  onError,
}: UseProductParseOptions) {
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [parseJobId, setParseJobId] = useState<string | null>(null);
  const [canonicalSourceUrl, setCanonicalSourceUrl] = useState<string | null>(null);
  const [parseMetadata, setParseMetadata] = useState<Record<string, unknown> | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [photoDisambiguation, setPhotoDisambiguation] = useState<PhotoDisambiguation | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const applyParseData = useCallback(
    async (data: ProductParseApiData) => {
      const nextCategory = data.category ?? form.category;
      const nextMaterialId = data.material_id ?? form.materialId;
      const nextThickness = data.thickness ?? form.thickness;

      if (data.job_id) setParseJobId(data.job_id);
      if (data.canonical_url) setCanonicalSourceUrl(data.canonical_url);
      setParseMetadata({
        platform: data.platform,
        item_id: data.item_id,
        price_text: data.price_text,
        warnings: data.warnings,
        parsed_at: new Date().toISOString(),
      });

      if (data.name) form.setName(data.name);
      if (data.category) {
        const normalizedCategory = normalizeCategoryCode(data.category);
        if (normalizedCategory) form.setCategory(normalizedCategory);
      }
      if (data.material_id) form.setMaterialId(data.material_id);
      if (data.thickness) form.setThickness(data.thickness);
      if (data.size_label) {
        const matchedSize =
          sizes.find(
            (size) => size.code === data.size_label || size.label === data.size_label
          ) ?? sizes.find((size) => data.size_label?.includes(size.code));
        form.setSizeLabel(matchedSize?.code ?? data.size_label);
      }
      if (data.image_url) setImageUrl(data.image_url);

      const warnings = data.warnings ?? [];
      const priceNote = data.price_text ? `参考价 ${data.price_text}` : null;
      const notice = [...warnings, priceNote].filter(Boolean).join(" ");
      setParseNotice(
        notice ||
          (data.name
            ? "已导入商品信息；解析记录已写入数据库，点「保存至衣柜」后才会加入衣柜。"
            : null)
      );

      await refreshWarmthPreview({
        category: nextCategory,
        materialId: nextMaterialId,
        thickness: nextThickness,
        sizeLabel: data.size_label ?? form.sizeLabel,
      });
    },
    [form, sizes, refreshWarmthPreview]
  );

  const runScreenshotParse = useCallback(
    async (file: File) => {
      setParseStatus("正在识别商品信息…");

      const formData = new FormData();
      formData.append("image", file);
      if (url.trim()) formData.append("source_url", url.trim());

      const response = await fetch("/api/clothing/parse-image", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ProductParseApiData;
      if (!response.ok) throw new Error(data.error ?? "截图识别失败");
      await applyParseData(data);
    },
    [url, applyParseData]
  );

  const runWardrobeScan = useCallback(
    async (file: File, previewUrl: string) => {
      setParseStatus("正在识别衣柜照片…");

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/clothing/scan-wardrobe", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as WardrobeScanApiResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "衣柜识别失败");

      saveWardrobeScanSession({
        scanResult: data,
        previewUrl,
        fromAdd: true,
      });
      router.push("/add/scan");
    },
    [router]
  );

  const routePhotoByScene = useCallback(
    async (file: File, previewUrl: string, scene: PhotoScene) => {
      if (scene === "product_screenshot") {
        await runScreenshotParse(file);
        return;
      }
      await runWardrobeScan(file, previewUrl);
    },
    [runScreenshotParse, runWardrobeScan]
  );

  const handleParseUrl = useCallback(async () => {
    if (!url.trim()) return;

    setParsing(true);
    setParseStatus(null);
    onError("");
    setParseNotice(null);

    try {
      const response = await fetch("/api/clothing/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: url.trim() }),
      });
      const data = (await response.json()) as ProductParseApiData;
      if (!response.ok) throw new Error(data.error ?? "解析失败");
      await applyParseData(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "解析失败");
    } finally {
      setParsing(false);
      setParseStatus(null);
    }
  }, [url, applyParseData, onError]);

  const handlePhotoChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      setParsing(true);
      setParseStatus("正在分析照片类型…");
      onError("");
      setParseNotice(null);
      setPhotoDisambiguation(null);

      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);

      try {
        const classifyForm = new FormData();
        classifyForm.append("image", file);

        const classifyResponse = await fetch("/api/clothing/classify-photo-scene", {
          method: "POST",
          body: classifyForm,
        });
        const classifyData = (await classifyResponse.json()) as {
          scene?: PhotoScene;
          confidence?: number;
          hints?: string[];
          error?: string;
        };
        if (!classifyResponse.ok) {
          throw new Error(classifyData.error ?? "场景分类失败");
        }

        const sceneResult = {
          scene: classifyData.scene ?? ("ambiguous" as PhotoScene),
          confidence: classifyData.confidence ?? 0,
          hints: classifyData.hints ?? [],
        };

        if (shouldDisambiguateScene(sceneResult)) {
          setPhotoDisambiguation({
            file,
            previewUrl,
            hints: sceneResult.hints,
          });
          setParseNotice(
            sceneResult.scene === "ambiguous" || sceneResult.confidence < SCENE_CONFIDENCE_THRESHOLD
              ? "无法自动判断照片类型，请选择下方选项。"
              : null
          );
          return;
        }

        await routePhotoByScene(file, previewUrl, sceneResult.scene);
      } catch (error) {
        onError(error instanceof Error ? error.message : "照片识别失败");
      } finally {
        setParsing(false);
        setParseStatus(null);
      }
    },
    [onError, routePhotoByScene]
  );

  const handleDisambiguationChoice = useCallback(
    async (scene: "product_screenshot" | "physical_wardrobe") => {
      if (!photoDisambiguation) return;

      const { file, previewUrl } = photoDisambiguation;
      setPhotoDisambiguation(null);
      setParsing(true);
      setParseStatus(
        scene === "product_screenshot" ? "正在识别商品信息…" : "正在识别衣柜照片…"
      );
      onError("");
      setParseNotice(null);

      try {
        await routePhotoByScene(file, previewUrl, scene);
      } catch (error) {
        onError(error instanceof Error ? error.message : "照片识别失败");
      } finally {
        setParsing(false);
        setParseStatus(null);
      }
    },
    [photoDisambiguation, onError, routePhotoByScene]
  );

  const cancelPhotoDisambiguation = useCallback(() => {
    setPhotoDisambiguation(null);
    setParseNotice(null);
  }, []);

  return {
    parsing,
    parseStatus,
    parseNotice,
    imageUrl,
    parseJobId,
    canonicalSourceUrl,
    parseMetadata,
    screenshotPreview,
    photoDisambiguation,
    screenshotInputRef,
    handleParseUrl,
    handlePhotoChange,
    handleDisambiguationChoice,
    cancelPhotoDisambiguation,
  };
}
