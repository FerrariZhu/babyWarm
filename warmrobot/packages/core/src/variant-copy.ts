/**
 * Template-based pros/cons/usage copy for garment_variants rows.
 * Benefits fit a mobile checklist line (at most 9 characters).
 */
import type {
  BodysuitStyle,
  FillType,
  FitType,
  GarmentThickness,
  HatKind,
  Material,
  PantLength,
  SockHeight,
} from "./variant-axis-types";
import type { ClothingCategory } from "./types";
import type { VariantCopyCard } from "./daily-brief-types";
import { buildVariantSubtitleFromRow } from "./variant-subtitle";
import { VARIANT_COPY_MAX_LEN } from "./variant-copy-compact";

export type { VariantCopyCard } from "./daily-brief-types";
export { VARIANT_COPY_MAX_LEN, compactVariantCopy } from "./variant-copy-compact";

export type VariantCopyParams = {
  category: ClothingCategory;
  material: Material | null;
  fillType: FillType | null;
  thickness: GarmentThickness | null;
  fitType: FitType | null;
  bodysuitStyle: BodysuitStyle | null;
  pantLength: PantLength | null;
  sockHeight: SockHeight | null;
  hatKind?: HatKind | null;
};

export type VariantCopy = {
  pros: string;
  cons: string;
  usageTips: string;
};

export type VariantCopyRow = {
  id: string;
  category_code: string;
  consumer_label: string;
  consumer_label_en?: string | null;
  material?: string | null;
  fill_type?: string | null;
  thickness?: string | null;
  fit_type?: string | null;
  bodysuit_style?: string | null;
  pant_length?: string | null;
  sock_height?: string | null;
  pros: string;
  cons: string;
  usage_tips: string;
  warmth_value: number;
  sort_order: number;
};

// The category leads the sentence. Fabric copy uses the part of the body or
// care benefit relevant to that garment, rather than repeating material names.
const MATERIAL_BENEFIT: Record<Material, [string, string, string]> = {
  cotton: ["轻薄吸汗", "柔软吸汗", "厚实柔软"],
  modal: ["轻薄柔滑", "贴身柔滑", "厚实柔滑"],
  polyester: ["轻薄易干", "洗后易干", "厚实易干"],
  acrylic: ["轻薄蓬松", "蓬松轻软", "厚实蓬松"],
  wool: ["轻薄暖和", "暖和蓬松", "厚实暖和"],
  fleece: ["轻薄软和", "轻软暖和", "厚绒暖和"],
  down: ["轻巧不沉", "蓬松轻盈", "加厚御寒"],
};

const CATEGORY_FABRIC_BENEFIT: Partial<Record<ClothingCategory, Partial<Record<Material, [string, string, string]>>>> = {
  bodysuit_short: { cotton: ["薄棉轻软", "贴肚柔软", "厚棉护肚"] },
  bodysuit_long: { cotton: ["薄棉亲肤", "贴身软和", "厚款暖身"] },
  tshirt_short: { cotton: ["薄款吸汗", "棉布吸汗", "厚款软和"] },
  tshirt_long: { cotton: ["薄款亲肤", "贴肤柔软", "厚款暖和"] },
  thermal_top: { cotton: ["薄而柔软", "贴身吸汗", "贴身加暖"] },
  sweater: { cotton: ["薄织柔软", "棉织软和", "厚织暖和"] },
  fleece_top: { cotton: ["薄款好叠", "贴肤软和", "厚款挡凉"], fleece: ["薄绒轻巧", "绒面软和", "厚绒添暖"] },
  vest: { cotton: ["薄棉贴身", "棉面柔软", "胸背加暖"], fleece: ["薄绒不沉", "胸背暖和", "厚绒护背"], wool: ["薄织护背", "胸背添暖", "厚织护背"] },
  outer_uv: { cotton: ["棉面柔软", "棉面柔软", "棉面柔软"], polyester: ["洗后好干", "洗后好干", "洗后好干"] },
  outer_shell: { cotton: ["薄款好收", "棉面软和", "厚款添暖"], fleece: ["薄绒挡凉", "绒面添暖", "厚绒挡冷"] },
  outer_cotton: { cotton: ["薄款轻便", "棉面柔软", "厚款暖和"] },
  long_johns: { cotton: ["薄棉贴腿", "贴腿柔软", "腿上添暖"] },
  pants_short: { cotton: ["贴腿吸汗", "贴腿吸汗", "贴腿吸汗"], polyester: ["沾水易干", "沾水易干", "沾水易干"] },
  pants_mid: { cotton: ["薄棉轻软", "棉布柔软", "厚款护腿"] },
  pants_long: { cotton: ["薄款轻软", "棉布软和", "厚款暖腿"], fleece: ["薄绒贴腿", "绒面暖腿", "厚绒挡凉"] },
  scarf: { cotton: ["轻薄贴颈", "贴颈柔软", "厚款暖颈"], fleece: ["轻绒围颈", "绒面暖颈", "厚绒挡冷"], wool: ["薄织暖颈", "羊毛暖颈", "厚织挡冷"] },
  gloves: { cotton: ["薄棉吸汗", "手心吸汗", "厚棉暖手"], fleece: ["薄绒轻软", "绒面暖手", "厚绒护手"], wool: ["薄织暖手", "羊毛暖手", "厚织护手"] },
  socks: { cotton: ["薄袜吸汗", "柔软吸汗", "厚棉暖脚"] },
};

const MAT_CON: Record<Material, string> = {
  cotton: "汗后易贴肤",
  modal: "耐磨略逊棉",
  polyester: "闷热易贴肤",
  acrylic: "亲肤感一般",
  wool: "或觉微扎肤",
  fleece: "大风需外挡",
  down: "遇潮保暖降",
};

const FIT_CON: Partial<Record<FitType, string>> = {
  slim: "穿脱略慢",
  loose: "视觉略宽大",
};

const THICK_CON: Partial<Record<GarmentThickness, string>> = {
  thin: "单穿略偏凉",
  medium: "极冷可能不够",
  thick: "活动易闷汗",
  lightweight: "深寒可能不够",
  regular_fill: "极热略偏厚",
  extreme_cold: "室内易过热",
  standard: "极寒需加袜",
  breathable: "冷天保暖弱",
  fleece_lined: "室内易过热",
};

/** Regular / loose / slim cuts: explain the benefit in the category's context. */
const CUT_BENEFIT: Partial<Record<ClothingCategory, [string, string, string]>> = {
  tshirt_short: ["方便单穿", "抬手自在", "方便打底"],
  tshirt_long: ["遮住手臂", "抬手自在", "方便打底"],
  thermal_top: ["方便叠穿", "活动自在", "打底平整"],
  sweater: ["内外好搭", "里面宽松", "内搭平整"],
  fleece_top: ["套上添暖", "伸手自在", "贴身少褶"],
  vest: ["胳膊好动", "抬手不绷", "贴身护背"],
  vest_down: ["抬臂轻松", "叠衣不紧", "贴身护胸"],
  outer_uv: ["遮挡日晒", "内搭好穿", "方便叠穿"],
  outer_shell: ["出门挡风", "加衣好套", "外搭挡风"],
  outer_cotton: ["外穿挡凉", "里面能加", "外搭添暖"],
  outer_down: ["冬天保暖", "多穿好套", "外搭御寒"],
  long_johns: ["腿上加暖", "活动自在", "打底平整"],
  pants_short: ["腿上凉快", "迈腿自在", "方便打底"],
  pants_mid: ["小腿凉快", "迈腿自在", "方便打底"],
  scarf: ["领口挡风", "领口挡风", "领口挡风"],
  gloves: ["挡住冷风", "挡住冷风", "挡住冷风"],
};

type WarmthBand = "hot" | "mild" | "cold";

const USAGE: Partial<Record<ClothingCategory, Record<WarmthBand, string>>> = {
  bodysuit_short: {
    hot: "热天居家，换尿布",
    mild: "温天打底，室内外",
    cold: "凉天内搭，再叠一层",
  },
  bodysuit_long: {
    hot: "微凉室内，长袖打底",
    mild: "春秋打底，少件数",
    cold: "冷天内搭，再叠一层",
  },
  tshirt_short: {
    hot: "热天居家，短行外出",
    mild: "温天日常，室内外",
    cold: "凉天打底，叠穿用",
  },
  tshirt_long: {
    hot: "早晚微凉，室内穿",
    mild: "春秋日常，好搭配",
    cold: "凉天打底，叠中层",
  },
  thermal_top: {
    hot: "微凉室内，贴身打底",
    mild: "初凉打底，不显肿",
    cold: "冷天贴身，第一层",
  },
  sweater: {
    hot: "室内微凉，中层穿",
    mild: "凉天中层，好蓄热",
    cold: "冷天中层，再套外套",
  },
  fleece_top: {
    hot: "微凉户外，轻便单层",
    mild: "凉天户外，活动穿",
    cold: "冷天中层，再套外套",
  },
  vest: {
    hot: "温天护胸，不缚臂",
    mild: "过渡护芯，好叠穿",
    cold: "冷天护胸，叠中层",
  },
  vest_down: {
    hot: "凉天护芯，轻量穿",
    mild: "冷天户外，护核心",
    cold: "严寒护芯，叠外套",
  },
  outer_uv: {
    hot: "晴日户外，防晒透气",
    mild: "晴日户外，防晒透气",
    cold: "晴日户外，防晒透气",
  },
  outer_shell: {
    hot: "有风微凉，户外穿",
    mild: "有风外出，挡小雨",
    cold: "冷天外层，防风穿",
  },
  outer_cotton: {
    hot: "凉天外出，日常穿",
    mild: "冷天外出，抗风穿",
    cold: "严寒外出，外层穿",
  },
  outer_down: {
    hot: "轻量外出，不太冷",
    mild: "冷天外出，主力穿",
    cold: "严寒户外，长时间",
  },
  long_johns: {
    hot: "微凉睡眠，贴身穿",
    mild: "冷天打底，护腿穿",
    cold: "极寒打底，第一层",
  },
  pants_short: {
    hot: "热天居家，户外玩",
    mild: "温天短行，好活动",
    cold: "凉天少穿，配长袜",
  },
  pants_mid: {
    hot: "温天过渡，不想长裤",
    mild: "过渡季，日常穿",
    cold: "凉天外出，配外套",
  },
  pants_long: {
    hot: "微凉外出，护腿穿",
    mild: "凉天外出，挡风穿",
    cold: "冷天外出，主力穿",
  },
  scarf: {
    hot: "大风天，护颈用",
    mild: "凉天外出，护颈穿",
    cold: "严寒户外，必备项",
  },
  gloves: {
    hot: "微凉户外，护手用",
    mild: "冷天户外，防冻手",
    cold: "严寒户外，长时间",
  },
  socks: {
    hot: "热天短袜，配凉鞋",
    mild: "温天中筒，日常穿",
    cold: "冷天长筒，叠穿暖",
  },
  other: {
    hot: "按清单对照选用",
    mild: "按清单对照选用",
    cold: "按清单对照选用",
  },
};

const HAT_COPY: Record<HatKind, VariantCopy> = {
  sun: { pros: "帽檐遮阳，脸上少晒", cons: "大风易掀，不保暖", usageTips: "晴日户外，紫外线强" },
  everyday: { pros: "日常好搭，方便出门", cons: "极寒暴晒需换款", usageTips: "日常短行，好搭配" },
  warm: { pros: "包住头部，冷天添暖", cons: "室内易闷，热天别戴", usageTips: "冷天户外，大风天" },
};

function warmthBand(thickness: GarmentThickness | null, hatKind?: HatKind | null): WarmthBand {
  if (hatKind === "sun") return "hot";
  if (hatKind === "warm") return "cold";
  switch (thickness) {
    case "thin":
    case "lightweight":
    case "breathable":
      return "hot";
    case "thick":
    case "extreme_cold":
    case "fleece_lined":
      return "cold";
    default:
      return "mild";
  }
}

function joinCopyParts(parts: string[], maxLen = VARIANT_COPY_MAX_LEN): string {
  const seen = new Set<string>();
  let out = "";
  for (const raw of parts) {
    const p = raw.trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    const sep = out ? "，" : "";
    if (out.length + sep.length + p.length > maxLen) break;
    out += sep + p;
  }
  return out;
}

function styleHint(style: BodysuitStyle | null): string | null {
  if (style === "triangle") return "换尿布方便";
  if (style === "long_leg") return "一条顶上下";
  return null;
}

function sockHint(height: SockHeight | null): string | null {
  if (height === "no_show") return "配浅口鞋";
  if (height === "ankle") return "配凉鞋短行";
  if (height === "mid_calf") return "护踝日常穿";
  if (height === "over_calf") return "护小腿保暖";
  return null;
}

function pantHint(length: PantLength | null): string | null {
  if (length === "nine_tenth") return "露踝更灵活";
  if (length === "full_length") return "裤脚更挡风";
  return null;
}

function composePros(params: VariantCopyParams): string {
  const { category, material, thickness, fitType, bodysuitStyle, pantLength, sockHeight } = params;
  const weight = warmthBand(thickness);
  const fabric = material
    ? (CATEGORY_FABRIC_BENEFIT[category]?.[material] ?? MATERIAL_BENEFIT[material])[weight === "hot" ? 0 : weight === "cold" ? 2 : 1]
    : "穿着轻便";
  let benefit: string;
  if (category === "bodysuit_short" || category === "bodysuit_long") {
    benefit = bodysuitStyle === "long_leg" ? "包住肚腿" : "尿布好换";
  } else if (category === "pants_long") {
    benefit = pantLength === "nine_tenth"
      ? (fitType === "loose" ? "宽松露踝" : "裤脚利落")
      : (fitType === "loose" ? "宽松盖踝" : "盖住脚踝");
  } else if (category === "socks") {
    const sockBenefits: Record<SockHeight, string> = {
      no_show: "配浅口鞋",
      ankle: "脚踝凉快",
      mid_calf: "垫住鞋口",
      over_calf: "小腿加暖",
    };
    benefit = sockBenefits[sockHeight ?? "mid_calf"];
  } else {
    const cut = fitType === "loose" ? 1 : fitType === "slim" ? 2 : 0;
    benefit = CUT_BENEFIT[category]?.[cut] ?? "方便日常";
  }
  // Do not truncate: both benefits must survive in the displayed sentence.
  return `${benefit}，${fabric}`;
}

function composeCons(params: VariantCopyParams): string {
  const { category, material, thickness, fitType } = params;
  const parts: string[] = [];

  if (material) parts.push(MAT_CON[material]);
  if (thickness && THICK_CON[thickness]) parts.push(THICK_CON[thickness]!);
  if (fitType && fitType !== "regular" && FIT_CON[fitType]) {
    parts.push(FIT_CON[fitType]!);
  }

  if (parts.length === 0) {
    if (category === "other") return "无固定属性，需自判";
    parts.push("按场景叠穿调整");
  }

  return joinCopyParts(parts);
}

function composeUsage(params: VariantCopyParams): string {
  const { category, thickness, bodysuitStyle, pantLength, sockHeight, hatKind } = params;
  const band = warmthBand(thickness, hatKind);

  const base = USAGE[category]?.[band];
  const hints = [
    styleHint(bodysuitStyle),
    pantHint(pantLength),
    sockHint(sockHeight),
  ].filter(Boolean) as string[];

  if (base && hints.length === 0) return base.length <= VARIANT_COPY_MAX_LEN ? base : base.slice(0, VARIANT_COPY_MAX_LEN);

  const parts = base ? [base.split("，")[0]!, ...hints] : hints;
  const joined = joinCopyParts(parts);
  return joined || "按当日天气选用";
}

function shoeCopy(params: VariantCopyParams): VariantCopy {
  const { category, thickness } = params;
  if (category === "shoes_sandal") {
    return {
      pros: "脚面透气，热天凉快",
      cons: "护趾弱，防滑一般",
      usageTips: "盛夏短行，室内外",
    };
  }
  if (category === "shoes_sneaker") {
    if (thickness === "breathable") {
      return {
        pros: "鞋面透气，热气易散",
        cons: "保暖弱，冷天换袜",
        usageTips: "热天学步，户外玩",
      };
    }
    return {
      pros: "包住脚趾，减少磕碰",
      cons: "闷脚时换透气款",
      usageTips: "日常学步，主力鞋",
    };
  }
  if (category === "shoes_leather") {
    if (thickness === "fleece_lined") {
      return {
        pros: "绒里保暖，脚上添暖",
        cons: "偏重，室内易热",
        usageTips: "冷天外出，稍正式",
      };
    }
    return {
      pros: "鞋面挺括，穿着有型",
      cons: "新鞋偏硬，需磨合",
      usageTips: "春秋过渡，稍正式",
    };
  }
  if (category === "shoes_boot") {
    if (thickness === "fleece_lined") {
      return {
        pros: "绒里保暖，脚踝也暖",
        cons: "偏重，穿脱略慢",
        usageTips: "寒冬雨雪，室外穿",
      };
    }
    return {
      pros: "鞋帮较高，盖住脚踝",
      cons: "偏重，室内易热",
      usageTips: "雨雪冷天，户外穿",
    };
  }
  return {
    pros: composePros(params),
    cons: composeCons(params),
    usageTips: composeUsage(params),
  };
}

/** Build pros/cons/usage copy for one garment variant attribute combination. */
export function buildVariantCopy(params: VariantCopyParams): VariantCopy {
  const { category, hatKind } = params;

  if (category === "other") {
    return {
      pros: "按需添衣，方便调整",
      cons: "无固定属性，需自判",
      usageTips: "按清单对照选用",
    };
  }

  if (category === "hat" && hatKind) {
    return HAT_COPY[hatKind];
  }

  if (category.startsWith("shoes_")) {
    return shoeCopy(params);
  }

  const copy = {
    pros: composePros(params),
    cons: composeCons(params),
    usageTips: composeUsage(params),
  };

  return copy;
}

export function mapVariantCopyRow(
  row: VariantCopyRow,
  options?: { isRecommended?: boolean }
): VariantCopyCard {
  const title = row.consumer_label.trim();
  const subtitle = buildVariantSubtitleFromRow(row);
  const labelEn = row.consumer_label_en?.trim() || undefined;
  return {
    id: row.id,
    categoryCode: row.category_code,
    title,
    subtitle,
    labelEn,
    pros: row.pros ?? "",
    cons: row.cons ?? "",
    usageTips: row.usage_tips ?? "",
    warmthValue: Number(row.warmth_value),
    sortOrder: row.sort_order,
    isRecommended: options?.isRecommended,
  };
}

/** Group variant copy cards by category_code for checklist half-sheet lookup. */
export function groupVariantCopyByCategory(
  cards: VariantCopyCard[]
): Record<string, VariantCopyCard[]> {
  const out: Record<string, VariantCopyCard[]> = {};
  for (const c of cards) {
    const list = out[c.categoryCode] ?? [];
    list.push(c);
    out[c.categoryCode] = list;
  }
  for (const code of Object.keys(out)) {
    out[code]!.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return out;
}
