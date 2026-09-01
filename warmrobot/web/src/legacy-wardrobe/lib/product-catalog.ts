import type { OneboundItem } from "@/legacy-wardrobe/lib/onebound-item-get";
import {
  normalizeItemImgs,
  normalizeOneboundSkus,
  oneboundIsTmall,
  oneboundNumericFields,
  oneboundPriceText,
  oneboundShopName,
  propsToMaterialHint,
} from "@/legacy-wardrobe/lib/onebound-item-get";
import {
  detectProductPlatform,
  extractTaobaoItemId,
  inferCategoryFromTitle,
  inferSizeLabelFromTitle,
  inferThicknessFromTitle,
  type ProductPlatform,
} from "@/legacy-wardrobe/lib/taobao-product-parser";

export type ProductCatalogRow = {
  platform: ProductPlatform;
  item_id: string;
  sku_id: string;
  source_url: string;
  canonical_url: string;
  title: string;
  short_desc?: string | null;
  brand?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  root_category_id?: string | null;
  price?: number | null;
  promotion_price?: number | null;
  original_price?: number | null;
  price_text?: string | null;
  pic_url?: string | null;
  item_imgs?: unknown;
  desc_img?: unknown;
  video?: unknown;
  stock_num?: number | null;
  min_num?: number | null;
  total_sold?: string | null;
  shop_id?: string | null;
  shop_name?: string | null;
  seller_id?: string | null;
  seller_nick?: string | null;
  shop_type?: string | null;
  is_tmall?: boolean | null;
  props?: unknown;
  props_name?: string | null;
  props_list?: unknown;
  property_alias?: string | null;
  skus?: unknown;
  location?: string | null;
  post_fee?: number | null;
  express_fee?: number | null;
  inferred_category?: string | null;
  inferred_thickness?: string | null;
  inferred_size_label?: string | null;
  material_hint?: string | null;
  raw_payload: OneboundItem;
  fetched_at: string;
};

function extractSkuIdFromUrl(sourceUrl: string): string {
  try {
    const skuId = new URL(sourceUrl).searchParams.get("skuId");
    return skuId?.trim() || "";
  } catch {
    const match = sourceUrl.match(/[?&]skuId=(\d+)/i);
    return match?.[1] ?? "";
  }
}

export function mapOneboundToCatalogRow(
  sourceUrl: string,
  item: OneboundItem
): ProductCatalogRow {
  const platform = detectProductPlatform(sourceUrl);
  const itemId =
    extractTaobaoItemId(sourceUrl) ??
    (item.num_iid != null ? String(item.num_iid) : null);

  if (!itemId) {
    throw new Error(`无法从链接解析商品 ID: ${sourceUrl}`);
  }

  const title = item.title?.trim();
  if (!title) {
    throw new Error(`商品 ${itemId} 缺少标题`);
  }

  const nums = oneboundNumericFields(item);
  const skuId = extractSkuIdFromUrl(sourceUrl);
  const materialHint = propsToMaterialHint(item) ?? title;

  return {
    platform,
    item_id: itemId,
    sku_id: skuId,
    source_url: sourceUrl,
    canonical_url: `https://item.taobao.com/item.htm?id=${itemId}`,
    title,
    short_desc: item.desc_short?.trim() || null,
    brand: item.brand?.trim() || null,
    brand_id: item.brandId != null ? String(item.brandId) : null,
    category_id: item.cid != null ? String(item.cid) : null,
    root_category_id: item.rootCatId != null ? String(item.rootCatId) : null,
    price: nums.price,
    promotion_price: nums.promotionPrice,
    original_price: nums.originalPrice,
    price_text: oneboundPriceText(item),
    pic_url: item.pic_url?.startsWith("//") ? `https:${item.pic_url}` : item.pic_url ?? null,
    item_imgs: normalizeItemImgs(item),
    desc_img: item.desc_img ?? [],
    video: item.video ?? null,
    stock_num: nums.stockNum,
    min_num: nums.minNum,
    total_sold: item.total_sold != null ? String(item.total_sold) : null,
    shop_id: item.shop_id != null ? String(item.shop_id) : item.seller_info?.sid != null ? String(item.seller_info.sid) : null,
    shop_name: oneboundShopName(item),
    seller_id:
      item.seller_id != null
        ? String(item.seller_id)
        : item.seller_info?.user_num_id != null
          ? String(item.seller_info.user_num_id)
          : null,
    seller_nick: item.nick?.trim() || item.seller_info?.nick?.trim() || null,
    shop_type: item.seller_info?.shop_type ?? null,
    is_tmall: oneboundIsTmall(item),
    props: item.props ?? [],
    props_name: item.props_name ?? null,
    props_list: item.props_list ?? {},
    property_alias: item.property_alias ?? null,
    skus: normalizeOneboundSkus(item),
    location: item.location ?? null,
    post_fee: nums.postFee,
    express_fee: nums.expressFee,
    inferred_category: inferCategoryFromTitle(title),
    inferred_thickness: inferThicknessFromTitle(title),
    inferred_size_label: inferSizeLabelFromTitle(title),
    material_hint: materialHint,
    raw_payload: item,
    fetched_at: new Date().toISOString(),
  };
}

export function catalogRowToRpcPayload(row: ProductCatalogRow): Record<string, unknown> {
  return {
    platform: row.platform,
    item_id: row.item_id,
    sku_id: row.sku_id,
    source_url: row.source_url,
    canonical_url: row.canonical_url,
    title: row.title,
    short_desc: row.short_desc,
    brand: row.brand,
    brand_id: row.brand_id,
    category_id: row.category_id,
    root_category_id: row.root_category_id,
    price: row.price != null ? String(row.price) : null,
    promotion_price: row.promotion_price != null ? String(row.promotion_price) : null,
    original_price: row.original_price != null ? String(row.original_price) : null,
    price_text: row.price_text,
    pic_url: row.pic_url,
    item_imgs: row.item_imgs,
    desc_img: row.desc_img,
    video: row.video,
    stock_num: row.stock_num != null ? String(row.stock_num) : null,
    min_num: row.min_num != null ? String(row.min_num) : null,
    total_sold: row.total_sold,
    shop_id: row.shop_id,
    shop_name: row.shop_name,
    seller_id: row.seller_id,
    seller_nick: row.seller_nick,
    shop_type: row.shop_type,
    is_tmall: row.is_tmall,
    props: row.props,
    props_name: row.props_name,
    props_list: row.props_list,
    property_alias: row.property_alias,
    skus: row.skus,
    location: row.location,
    post_fee: row.post_fee != null ? String(row.post_fee) : null,
    express_fee: row.express_fee != null ? String(row.express_fee) : null,
    inferred_category: row.inferred_category,
    inferred_thickness: row.inferred_thickness,
    inferred_size_label: row.inferred_size_label,
    material_hint: row.material_hint,
    raw_payload: row.raw_payload,
    fetched_at: row.fetched_at,
  };
}
