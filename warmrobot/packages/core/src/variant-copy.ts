/**
 * Template-based pros/cons/usage copy for garment_variants rows.
 * Composes from category (类型), material, fit, thickness — ~20 chars each.
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

const MAT_PRO: Record<Material, string> = {
  cotton: "棉质亲肤",
  modal: "莫代尔凉感",
  polyester: "涤纶速干",
  acrylic: "腈纶不易皱",
  wool: "羊毛天然暖",
  fleece: "抓绒轻暖",
  down: "羽绒极轻暖",
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

const FIT_PRO: Partial<Record<FitType, string>> = {
  slim: "贴身锁温",
  loose: "宽松好活动",
};

const FIT_CON: Partial<Record<FitType, string>> = {
  slim: "穿脱略慢",
  loose: "视觉略宽大",
};

const THICK_PRO: Partial<Record<GarmentThickness, string>> = {
  thin: "轻薄透气",
  medium: "厚薄适中",
  thick: "保暖挡风",
  lightweight: "轻量便携",
  regular_fill: "常规保暖",
  extreme_cold: "极寒高暖",
  standard: "均衡实用",
  breathable: "透气不闷",
  fleece_lined: "加绒保暖",
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

/** Category-specific pro when material axis is absent or as secondary cue. */
const TYPE_PRO: Partial<Record<ClothingCategory, string>> = {
  bodysuit_short: "包屁好打底",
  bodysuit_long: "长袖少空隙",
  tshirt_short: "短袖好活动",
  tshirt_long: "长袖护手臂",
  thermal_top: "打底不显肿",
  sweater: "中层好蓄热",
  fleece_top: "户外单穿暖",
  vest: "护胸不缚臂",
  vest_down: "护芯更灵活",
  outer_uv: "轻量防晒",
  outer_shell: "防风挡小雨",
  outer_cotton: "日常抗风",
  outer_down: "严寒高保暖",
  long_johns: "减少灌风",
  pants_short: "热天无束缚",
  pants_mid: "过渡季实用",
  pants_long: "护腿挡风",
  hat: "护头防风",
  scarf: "护颈挡风",
  gloves: "护手防冻",
  socks: "护脚保暖",
  shoes_sandal: "透气快干",
  shoes_sneaker: "包脚防滑",
  shoes_leather: "挺括耐脏",
  shoes_boot: "高帮护踝",
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
  sun: { pros: "遮阳透气，轻便好戴", cons: "大风易掀，不保暖", usageTips: "晴日户外，紫外线强" },
  everyday: { pros: "日常百搭，四季可用", cons: "极寒暴晒需换款", usageTips: "日常短行，好搭配" },
  warm: { pros: "护头防风，保暖蓄热", cons: "室内易闷，热天别戴", usageTips: "冷天户外，大风天" },
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

function fillHint(fill: FillType | null): string | null {
  if (fill === "cotton_wadding") return "棉絮厚实";
  if (fill === "polyester_fill") return "填充均匀";
  return null;
}

function composePros(params: VariantCopyParams): string {
  const { category, material, thickness, fitType, fillType } = params;
  const parts: string[] = [];

  if (material) parts.push(MAT_PRO[material]);
  else if (TYPE_PRO[category]) parts.push(TYPE_PRO[category]!);

  if (thickness && THICK_PRO[thickness]) parts.push(THICK_PRO[thickness]!);
  else if (!material && fillType) {
    const fh = fillHint(fillType);
    if (fh) parts.push(fh);
  }

  if (fitType && fitType !== "regular" && FIT_PRO[fitType]) {
    parts.push(FIT_PRO[fitType]!);
  }

  if (parts.length === 0 && TYPE_PRO[category]) parts.push(TYPE_PRO[category]!);

  return joinCopyParts(parts);
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
      pros: "透气快干，穿脱方便",
      cons: "护趾弱，防滑一般",
      usageTips: "盛夏短行，室内外",
    };
  }
  if (category === "shoes_sneaker") {
    if (thickness === "breathable") {
      return {
        pros: "网面透气，夏季不闷",
        cons: "保暖弱，冷天换袜",
        usageTips: "热天学步，户外玩",
      };
    }
    return {
      pros: "包脚护趾，防滑稳当",
      cons: "闷脚时换透气款",
      usageTips: "日常学步，主力鞋",
    };
  }
  if (category === "shoes_leather") {
    if (thickness === "fleece_lined") {
      return {
        pros: "绒里保暖，冬季护脚",
        cons: "偏重，室内易热",
        usageTips: "冷天外出，稍正式",
      };
    }
    return {
      pros: "皮质挺括，耐脏好擦",
      cons: "新鞋偏硬，需磨合",
      usageTips: "春秋过渡，稍正式",
    };
  }
  if (category === "shoes_boot") {
    if (thickness === "fleece_lined") {
      return {
        pros: "高帮加绒，雨雪防滑",
        cons: "偏重，穿脱略慢",
        usageTips: "寒冬雨雪，室外穿",
      };
    }
    return {
      pros: "高帮护踝，雨雪防滑",
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
      pros: "灵活兜底，对照清单",
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
