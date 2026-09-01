import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";

export type CatalogMatchResult = {
  catalogId: string;
  title: string;
  picUrl: string | null;
  similarity: number;
  inferredCategory: string | null;
  inferredThickness: string | null;
  materialHint: string | null;
};

export type WardrobeScanItemDraft = {
  tempId: string;
  name: string;
  category: ClothingCategory;
  thickness: ThicknessLevel;
  materialHint: string | null;
  materialId?: string;
  sizeLabel: string | null;
  confidence: number;
  regionDescription: string | null;
  colorHint: string | null;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
  previewImageUrl: string | null;
  imageBeautified: boolean;
  imageBeautifyFailed: boolean;
  warnings: string[];
  selected: boolean;
  catalogMatch: CatalogMatchResult | null;
  fieldSources: {
    category: "vision" | "catalog";
    thickness: "vision" | "catalog";
    material: "vision" | "catalog";
  };
};

export type WardrobeScanApiResponse = {
  job_id: string | null;
  scan_image_url: string | null;
  scene_notes: string | null;
  items: WardrobeScanItemDraft[];
  warnings: string[];
};

export type WardrobeScanBulkItem = {
  name: string;
  category: string;
  material_id: string;
  thickness: string;
  size_label?: string | null;
  fit_type?: string;
  fill_type?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
  image_url?: string | null;
  temp_id?: string | null;
  source_metadata?: Record<string, unknown>;
};
