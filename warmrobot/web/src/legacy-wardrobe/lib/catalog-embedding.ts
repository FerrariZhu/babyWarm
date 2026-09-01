import { createTextEmbedding as createEmbeddingFromProvider } from "@/legacy-wardrobe/lib/embedding-client";

export function buildCatalogEmbeddingText(row: {
  title: string;
  inferred_category?: string | null;
  inferred_thickness?: string | null;
  material_hint?: string | null;
  props_name?: string | null;
}): string {
  const parts = [
    row.title,
    row.inferred_category ? `类别:${row.inferred_category}` : null,
    row.inferred_thickness ? `厚度:${row.inferred_thickness}` : null,
    row.material_hint ? `材质:${row.material_hint}` : null,
    row.props_name ? `属性:${row.props_name}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function buildWardrobeItemEmbeddingText(item: {
  name: string;
  category: string;
  thickness: string;
  materialHint?: string | null;
  colorHint?: string | null;
  regionDescription?: string | null;
}): string {
  const parts = [
    item.name,
    `类别:${item.category}`,
    `厚度:${item.thickness}`,
    item.materialHint ? `材质:${item.materialHint}` : null,
    item.colorHint ? `颜色:${item.colorHint}` : null,
    item.regionDescription ? `位置:${item.regionDescription}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

export async function createTextEmbedding(text: string): Promise<number[]> {
  return createEmbeddingFromProvider(text);
}

export function formatEmbeddingForPg(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export { isEmbeddingConfigured } from "@/legacy-wardrobe/lib/embedding-client";
