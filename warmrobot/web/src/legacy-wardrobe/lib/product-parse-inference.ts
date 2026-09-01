import type { ClothingCategory } from "@warmrobot/core";
import type { ThicknessLevel } from "@/lib/db/types";

const CATEGORY_RULES: { code: ClothingCategory; patterns: RegExp[] }[] = [
  { code: "shoes_boot", patterns: [/高帮靴/, /雪地靴/, /马丁靴/] },
  { code: "shoes_leather", patterns: [/皮鞋/, /学步鞋.*皮/] },
  { code: "shoes_sneaker", patterns: [/运动鞋/, /学步鞋/, /机能鞋/] },
  { code: "shoes_sandal", patterns: [/凉鞋/, /拖鞋/] },
  { code: "bodysuit_short", patterns: [/短袖.*包屁/, /包屁衣.*短袖/, /和尚服/] },
  { code: "bodysuit_long", patterns: [/长袖.*包屁/, /连体/, /连身/, /哈衣/, /爬服/] },
  { code: "tshirt_short", patterns: [/短袖.*T恤/, /短袖T/, /T恤.*短袖/] },
  { code: "tshirt_long", patterns: [/长袖.*T恤/, /长袖T/] },
  { code: "thermal_top", patterns: [/秋衣/, /打底/, /内衣/, /内搭/] },
  { code: "long_johns", patterns: [/秋裤/, /保暖裤/] },
  { code: "outer_down", patterns: [/羽绒服/] },
  { code: "outer_cotton", patterns: [/棉服/, /棉衣/] },
  { code: "outer_uv", patterns: [/防晒衣/, /防晒服/, /UV/] },
  { code: "outer_shell", patterns: [/外套/, /夹克/, /大衣/, /风衣/, /冲锋衣/] },
  { code: "pants_mid", patterns: [/中裤/, /七分裤/, /7分裤/] },
  { code: "pants_short", patterns: [/短裤/] },
  { code: "pants_long", patterns: [/九分裤/, /长裤/, /打底裤/, /PP裤/, /裤子/, /裤$/] },
  { code: "fleece_top", patterns: [/卫衣/, /抓绒/] },
  { code: "sweater", patterns: [/毛衣/, /针织/, /开衫/] },
  { code: "vest", patterns: [/马甲/, /背心/] },
  { code: "hat", patterns: [/帽/, /胎帽/] },
  { code: "socks", patterns: [/袜/] },
  { code: "gloves", patterns: [/手套/] },
  { code: "scarf", patterns: [/围巾/, /围嘴/, /口水巾/, /围脖/] },
];

export function inferCategoryFromTitle(title: string): ClothingCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(title))) return rule.code;
  }
  return "bodysuit_long";
}

export function inferThicknessFromTitle(title: string): ThicknessLevel {
  if (/加厚|厚款|冬季|保暖|羽绒|棉服|夹棉|厚棉/.test(title)) return "thick";
  if (/薄款|单层|夏季|清爽|透气|薄棉|纱布/.test(title)) return "thin";
  return "medium";
}

export function inferSizeLabelFromTitle(title: string): string | null {
  const cm = title.match(/(\d{2,3})\s*(?:cm|CM|厘米|码)/);
  if (cm) return `${cm[1]}cm`;

  const month = title.match(/(\d{1,2})\s*[-~到至]\s*(\d{1,2})\s*(?:个月|M|月)/i);
  if (month) return `${month[1]}-${month[2]}M`;

  const singleMonth = title.match(/(\d{1,2})\s*(?:个月|M|月)/i);
  if (singleMonth) return `${singleMonth[1]}M`;

  return null;
}
