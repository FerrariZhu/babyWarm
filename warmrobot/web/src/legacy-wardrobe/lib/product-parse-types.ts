import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";

export type ProductPlatform = "taobao" | "tmall" | "screenshot" | "unknown";

export type ProductParseSource =
  | "page"
  | "share_text"
  | "api"
  | "fallback"
  | "screenshot";

/** Normalized draft from URL, API, HTML, or vision parsers before DB material resolution. */
export type ParsedProductDraft = {
  platform: ProductPlatform;
  itemId: string | null;
  canonicalUrl: string;
  name: string;
  category: ClothingCategory;
  thickness: ThicknessLevel;
  sizeLabel: string | null;
  imageUrl: string | null;
  priceText: string | null;
  materialHint: string | null;
  source: ProductParseSource;
  warnings: string[];
};
