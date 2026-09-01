const ONEBOUND_BASE = "https://api-gw.onebound.cn/taobao/item_get/";

export type OneboundItem = {
  num_iid?: string | number;
  title?: string;
  desc_short?: string;
  pic_url?: string;
  price?: string | number;
  promotion_price?: string | number;
  orginal_price?: string | number;
  total_price?: string | number;
  brand?: string;
  brandId?: string | number;
  cid?: string | number;
  rootCatId?: string | number;
  num?: string | number;
  min_num?: string | number;
  total_sold?: string | number;
  detail_url?: string;
  item_imgs?: { url?: string }[] | string[];
  desc_img?: string[] | unknown;
  video?: unknown;
  props?: { name?: string; value?: string }[];
  props_name?: string;
  props_list?: Record<string, string>;
  property_alias?: string;
  skus?: {
    sku_id?: string | number;
    price?: string | number;
    quantity?: string | number;
    properties?: string;
    properties_name?: string;
    orginal_price?: string | number;
  };
  location?: string;
  post_fee?: string | number;
  express_fee?: string | number;
  shop_id?: string | number;
  seller_id?: string | number;
  nick?: string;
  seller_info?: {
    nick?: string;
    shop_name?: string;
    shop_type?: string;
    user_num_id?: string | number;
    sid?: string | number;
    title?: string;
  };
  tmall?: boolean | string;
  error?: string;
};

type OneboundResponse = {
  item?: OneboundItem;
  error?: string;
  error_code?: string;
};

function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http")) return trimmed;
  return trimmed;
}

export function propsToMaterialHint(item: OneboundItem): string | null {
  const parts: string[] = [];
  if (Array.isArray(item.props)) {
    for (const p of item.props) {
      if (p.name && p.value) parts.push(`${p.name}:${p.value}`);
    }
  }
  if (item.props_name) parts.push(item.props_name);
  const joined = parts.join(" ");
  return joined.trim() || null;
}

function parsePrice(value: string | number | undefined): number | null {
  if (value == null || value === "" || value === -1) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchOneboundItemRaw(numIid: string): Promise<OneboundItem | null> {
  const key = process.env.ONEBOUND_API_KEY?.trim();
  const secret = process.env.ONEBOUND_API_SECRET?.trim();
  if (!key || !secret) return null;

  const params = new URLSearchParams({
    key,
    secret,
    num_iid: numIid,
    is_promotion: "1",
    lang: "cn",
    cache: "no",
  });

  const res = await fetch(`${ONEBOUND_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as OneboundResponse;
  if (data.error?.trim()) return null;

  const item = data.item;
  if (!item?.title?.trim() || item.error) return null;

  return item;
}

export async function fetchOneboundItem(
  numIid: string
): Promise<{
  name: string;
  imageUrl: string | null;
  priceText: string | null;
  materialHint: string | null;
} | null> {
  const item = await fetchOneboundItemRaw(numIid);
  if (!item) return null;

  const price = item.promotion_price ?? item.price;
  const materialFromProps = propsToMaterialHint(item);

  return {
    name: item.title!.trim(),
    imageUrl: normalizeImageUrl(item.pic_url) ?? null,
    priceText: price != null && price !== "" && price !== -1 ? `¥${price}` : null,
    materialHint: materialFromProps ?? item.title!.trim(),
  };
}

export function normalizeOneboundSkus(item: OneboundItem): unknown[] {
  const skus = item.skus;
  if (!skus) return [];
  if (Array.isArray(skus)) return skus;
  if (typeof skus === "object" && "sku" in skus) {
    const nested = (skus as { sku?: unknown }).sku;
    if (Array.isArray(nested)) return nested;
    if (nested) return [nested];
  }
  return [skus];
}

export function oneboundPriceText(item: OneboundItem): string | null {
  const price = item.promotion_price ?? item.price;
  if (price == null || price === "" || price === -1) return null;
  return `¥${price}`;
}

export function oneboundShopName(item: OneboundItem): string | null {
  return item.seller_info?.shop_name?.trim() || item.seller_info?.title?.trim() || null;
}

export function oneboundIsTmall(item: OneboundItem): boolean | null {
  if (item.tmall === true || item.tmall === "true") return true;
  if (item.tmall === false || item.tmall === "false") return false;
  if (item.seller_info?.shop_type === "B") return true;
  return null;
}

export function oneboundNumericFields(item: OneboundItem) {
  return {
    price: parsePrice(item.price),
    promotionPrice: parsePrice(item.promotion_price),
    originalPrice: parsePrice(item.orginal_price),
    postFee: parsePrice(item.post_fee),
    expressFee: parsePrice(item.express_fee),
    stockNum: item.num != null ? Number(item.num) || null : null,
    minNum: item.min_num != null ? Number(item.min_num) || null : null,
  };
}

export function normalizeItemImgs(item: OneboundItem): unknown[] {
  if (!Array.isArray(item.item_imgs)) return [];
  return item.item_imgs.map((img) =>
    typeof img === "string" ? { url: normalizeImageUrl(img) } : img
  );
}
