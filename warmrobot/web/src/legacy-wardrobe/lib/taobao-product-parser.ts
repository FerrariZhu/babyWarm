import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";
import { fetchOneboundItem } from "@/legacy-wardrobe/lib/onebound-item-get";
import {
  inferCategoryFromTitle,
  inferSizeLabelFromTitle,
  inferThicknessFromTitle,
} from "@/legacy-wardrobe/lib/product-parse-inference";
import type { ParsedProductDraft, ProductPlatform } from "@/legacy-wardrobe/lib/product-parse-types";

export type { ParsedProductDraft, ProductPlatform } from "@/legacy-wardrobe/lib/product-parse-types";
export {
  inferCategoryFromTitle,
  inferSizeLabelFromTitle,
  inferThicknessFromTitle,
} from "@/legacy-wardrobe/lib/product-parse-inference";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const GENERIC_TITLES = new Set([
  "商品详情页",
  "商品详情",
  "淘宝",
  "天猫",
  "detail",
  "item",
]);

/** 从粘贴内容拆分链接与淘宝分享标题（「...」） */
export function splitPastedProductInput(raw: string): {
  sourceUrl: string;
  titleHint: string | null;
} {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  const sourceUrl = (urlMatch?.[0] ?? trimmed).replace(/[.,;，。；!?！？]+$/, "");

  const quoted = trimmed.match(/「([^」]{4,200})」/);
  if (quoted?.[1]) {
    return { sourceUrl, titleHint: quoted[1].trim() };
  }

  if (urlMatch) {
    const before = trimmed.slice(0, trimmed.indexOf(urlMatch[0]));
    const cleaned = before
      .replace(/[\d.]+[¥￥元]?/g, " ")
      .replace(/【[^】]+】/g, " ")
      .replace(/复制这条信息|打开淘宝|淘口令|点击链接/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 4) {
      return { sourceUrl, titleHint: cleaned };
    }
  }

  return { sourceUrl, titleHint: null };
}

export function detectProductPlatform(url: string): ProductPlatform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tmall")) return "tmall";
    if (host.includes("taobao") || host.includes("tb.cn")) return "taobao";
  } catch {
    /* ignore */
  }
  return "unknown";
}

/** 从淘宝/天猫链接提取数字商品 ID */
export function extractTaobaoItemId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("id");
    if (id && /^\d{8,20}$/.test(id)) return id;

    const pathMatch = parsed.pathname.match(/\/item\/(\d{8,20})/i);
    if (pathMatch?.[1]) return pathMatch[1];
  } catch {
    const loose = url.match(/[?&]id=(\d{8,20})/i);
    if (loose?.[1]) return loose[1];
  }
  return null;
}

export async function resolveProductUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": MOBILE_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
}

function isUsableTitle(title: string | null | undefined): title is string {
  if (!title) return false;
  const t = title.trim();
  if (t.length < 4 || t.length > 200) return false;
  if (GENERIC_TITLES.has(t)) return false;
  return true;
}

/** 从商品页 HTML 提取标题、主图、价格 */
export function parseProductHtml(html: string): {
  name: string | null;
  imageUrl: string | null;
  priceText: string | null;
} {
  let name: string | null = null;
  let imageUrl: string | null = null;
  let priceText: string | null = null;

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1] && isUsableTitle(ogTitle[1])) name = decodeJsonString(ogTitle[1].trim());

  const titlePatterns = [
    /"title"\s*:\s*"((?:\\.|[^"\\]){4,200})"/g,
    /"itemTitle"\s*:\s*"((?:\\.|[^"\\]){4,200})"/g,
    /"subject"\s*:\s*"((?:\\.|[^"\\]){4,200})"/g,
    /"name"\s*:\s*"((?:\\.|[^"\\]){4,120})"/g,
  ];

  for (const pattern of titlePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const candidate = decodeJsonString(match[1]).trim();
      if (isUsableTitle(candidate)) {
        name = candidate;
        break;
      }
    }
    if (name) break;
  }

  const imgMatch =
    html.match(/"(?:picUrl|image|mainPic|itemPic|img)"\s*:\s*"(https?:\/\/[^"]+)"/i) ??
    html.match(/(https?:\/\/img\.alicdn\.com\/[^"'\s]+)/i);
  if (imgMatch?.[1]) {
    imageUrl = imgMatch[1].startsWith("//") ? `https:${imgMatch[1]}` : imgMatch[1];
    imageUrl = imageUrl.replace(/_\d+x\d+\./, ".");
  }

  const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/i);
  if (priceMatch?.[1]) priceText = `¥${priceMatch[1]}`;

  return { name, imageUrl, priceText };
}

async function fetchTaobaoHtml(itemId: string): Promise<string | null> {
  const candidates = [
    `https://item.taobao.com/item.htm?id=${itemId}`,
    `https://detail.m.tmall.com/item.htm?id=${itemId}`,
    `https://detail.tmall.com/item.htm?id=${itemId}`,
  ];

  for (const pageUrl of candidates) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": MOBILE_UA,
          Accept: "text/html,application/xhtml+xml",
          Referer: "https://m.taobao.com/",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length > 8000 && !html.includes('"action": "login"')) {
        return html;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function fetchFromExternalApi(
  itemId: string,
  platform: ProductPlatform
): Promise<Partial<ParsedProductDraft> | null> {
  const apiUrl = process.env.TAOBAO_PARSE_API_URL?.trim();
  if (!apiUrl) return null;

  const endpoint = apiUrl
    .replaceAll("{itemId}", itemId)
    .replaceAll("{platform}", platform);

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.TAOBAO_PARSE_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const payload = (data.data ?? data.item ?? data) as Record<string, unknown>;
    const title =
      (payload.title as string) ??
      (payload.name as string) ??
      (payload.item_title as string);
    return {
      name: isUsableTitle(title) ? title : undefined,
      imageUrl: (payload.pic_url ?? payload.image ?? payload.image_url) as string | undefined,
      priceText: payload.price ? `¥${payload.price}` : undefined,
      source: "api",
    };
  } catch {
    return null;
  }
}

export async function parseTaobaoProductUrl(
  rawUrl: string,
  titleHint?: string | null
): Promise<ParsedProductDraft> {
  const warnings: string[] = [];
  const resolvedUrl = await resolveProductUrl(rawUrl.trim());
  const platform = detectProductPlatform(resolvedUrl);
  const itemId = extractTaobaoItemId(resolvedUrl);

  let name: string | null = isUsableTitle(titleHint) ? titleHint!.trim() : null;
  let imageUrl: string | null = null;
  let priceText: string | null = null;
  let materialHint: string | null = name;
  let source: ParsedProductDraft["source"] = name ? "share_text" : "fallback";

  if (itemId) {
    const onebound = await fetchOneboundItem(itemId);
    if (onebound) {
      name = onebound.name;
      imageUrl = onebound.imageUrl;
      priceText = onebound.priceText;
      materialHint = onebound.materialHint ?? name;
      source = "api";
    } else {
      const html = await fetchTaobaoHtml(itemId);
      if (html) {
        const parsed = parseProductHtml(html);
        if (!name && parsed.name) {
          name = parsed.name;
          source = "page";
        }
        imageUrl = parsed.imageUrl;
        priceText = parsed.priceText;
      } else if (!name) {
        warnings.push("无法直接读取商品页（平台登录/反爬限制），已尝试从分享文案推断。");
      }

      if (!name || source === "fallback") {
        const apiResult = await fetchFromExternalApi(itemId, platform);
        if (apiResult?.name) {
          name = apiResult.name;
          imageUrl = apiResult.imageUrl ?? imageUrl;
          priceText = apiResult.priceText ?? priceText;
          source = "api";
        }
      }
    }
  } else {
    warnings.push("未能识别商品 ID，请检查链接是否完整。");
  }

  if (!name) {
    name = itemId
      ? `${platform === "tmall" ? "天猫" : "淘宝"}商品 ${itemId}`
      : "待确认商品名称";
    source = "fallback";
    warnings.push("未能自动获取商品标题，请在下方手动修改名称。");
  }

  const category = inferCategoryFromTitle(name);
  const thickness = inferThicknessFromTitle(name);
  const sizeLabel = inferSizeLabelFromTitle(name);

  return {
    platform,
    itemId,
    canonicalUrl: itemId
      ? `https://item.taobao.com/item.htm?id=${itemId}`
      : resolvedUrl,
    name,
    category,
    thickness,
    sizeLabel,
    imageUrl,
    priceText,
    materialHint: materialHint ?? name,
    source,
    warnings,
  };
}
