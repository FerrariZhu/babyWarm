/**
 * Caregiver conclusion copy for「穿搭建议」.
 * Prompt / template source of truth: docs/specs/home-daily-brief.md §2.2
 */
import type {
  AdviceExtra,
  AdviceItem,
  DressingAdvice,
} from "./daily-brief-types";
import type { ClothingCategory, WeatherSnapshot } from "./types";
import { diaperAdviceSentence } from "./diaper-status";
import {
  DIAPER_OPTIONAL_AGE_MONTHS,
  HUMIDITY_HIGH_THRESHOLD,
  HUMIDITY_LOW_THRESHOLD,
  PRECIP_PROBABILITY_THRESHOLD,
  UV_MODERATE_THRESHOLD,
  UV_OUTDOOR_THRESHOLD,
  WIND_SPEED_WARMTH_THRESHOLD,
} from "./warmth-thresholds";

/** Aligns with WARMTH_CATEGORY_BANDS in category-advice.ts. */
export type HeatSlot = "hot" | "warm" | "mild" | "cool" | "cold" | "freezing";
export type UvSlot = "high" | "normal";
export type RainSlot = "raining" | "likely" | "none";

export interface AdviceCopySlots {
  heat: HeatSlot;
  uv: UvSlot;
  rain: RainSlot;
}

export interface FormattedAdviceCopy {
  blockTitle: string;
  headline: string;
  indoorHeading: string;
  outdoorHeading: string;
  extrasHeading: string;
  emptyOutdoor: string;
}

export const ADVICE_COPY = {
  blockTitleNow: "穿搭建议",
  indoorHeading: "家里穿",
  outdoorHeading: "出门再加",
  extrasHeading: "记得带",
  emptyOutdoor: "出门不用再加衣服。",
  checklistTitle: "穿搭清单",
  umbrellaLabel: "雨伞",
  rainRaining: "外面在下雨",
  rainLikely: "预计有雨",
  rainGearClause: "可以携带雨具",
} as const;

/** Re-export for callers that gate diaper tip inclusion. */
export { DIAPER_OPTIONAL_AGE_MONTHS };

/** §2.2: feelsLike − temp ≥ this → 体感偏热 / reverse → 体感偏凉 */
export const FEELS_DELTA_FACTOR_C = 3;
/** §2.2: wind ≤ this → 风不大 */
export const WIND_CALM_MAX_MS = 2;
/** Max weather factor phrases (weather-module helpers). */
export const MAX_WEATHER_FACTORS = 2;

const UV_OUTDOOR_CATEGORIES = new Set<ClothingCategory>(["hat", "outer_uv"]);
const COLD_ACCESSORY_CATEGORIES = new Set<ClothingCategory>([
  "hat",
  "scarf",
  "gloves",
]);

/** Friendlier outer names for caregiver copy (checklist label still drives specifics). */
const FRIENDLY_OUTER_LABEL: Partial<Record<ClothingCategory, string>> = {
  outer_cotton: "厚棉服",
  outer_down: "羽绒服",
  outer_shell: "春秋外套",
  outer_uv: "防晒衣",
};

/** Map requiredWarmth to heat slot using the same band edges as category bands. */
export function heatFromRequiredWarmth(requiredWarmth: number): HeatSlot {
  if (requiredWarmth < 25) return "hot";
  if (requiredWarmth < 40) return "warm";
  if (requiredWarmth < 55) return "mild";
  if (requiredWarmth < 70) return "cool";
  if (requiredWarmth < 85) return "cold";
  return "freezing";
}

export function rainFromWeather(weather: WeatherSnapshot): RainSlot {
  const text = weather.text ?? "";
  if (text.includes("雨")) return "raining";
  if (
    weather.precipProbability != null &&
    weather.precipProbability >= PRECIP_PROBABILITY_THRESHOLD
  ) {
    return "likely";
  }
  return "none";
}

export function toCopySlots(
  weather: WeatherSnapshot,
  requiredWarmth: number
): AdviceCopySlots {
  const uvIndex = weather.uvIndex ?? 0;
  return {
    heat: heatFromRequiredWarmth(requiredWarmth),
    uv: uvIndex >= UV_OUTDOOR_THRESHOLD ? "high" : "normal",
    rain: rainFromWeather(weather),
  };
}

export function umbrellaReasonFromRain(rain: RainSlot): string {
  if (rain === "raining") {
    return `${ADVICE_COPY.rainRaining}，${ADVICE_COPY.rainGearClause}。`;
  }
  if (rain === "likely") {
    return `${ADVICE_COPY.rainLikely}，${ADVICE_COPY.rainGearClause}。`;
  }
  return "";
}

/** Weather factor short phrases for summary (humidity → feels → wind; max 2). */
export function weatherFactorPhrases(weather: WeatherSnapshot): string[] {
  const factors: string[] = [];
  const humidity = weather.humidity ?? 0;
  const windSpeed = weather.windSpeed ?? 0;
  const temp = weather.temp ?? 0;
  const feelsLike = weather.feelsLike ?? temp;

  if (humidity >= HUMIDITY_HIGH_THRESHOLD) factors.push("湿度大");
  else if (humidity <= HUMIDITY_LOW_THRESHOLD) factors.push("空气偏干");

  const feelsDelta = feelsLike - temp;
  if (feelsDelta >= FEELS_DELTA_FACTOR_C) factors.push("体感偏热");
  else if (feelsDelta <= -FEELS_DELTA_FACTOR_C) factors.push("体感偏凉");

  if (windSpeed <= WIND_CALM_MAX_MS) factors.push("风不大");
  else if (windSpeed >= WIND_SPEED_WARMTH_THRESHOLD) factors.push("风较大");

  return factors.slice(0, MAX_WEATHER_FACTORS);
}

/** Normalize condition text for caregiver-facing summary. */
function normalizeConditionText(text: string): string {
  const t = text.trim();
  if (!t) return "天气一般";
  if (t.includes("雨")) return t;
  if (t === "晴") return "晴天";
  if (t === "阴") return "阴天";
  return t;
}

/**
 * One-sentence current-weather summary — always leads the conclusion paragraph.
 * Example: 「今天多云，气温 28°C，体感偏热。」
 */
export function weatherSummarySentence(weather: WeatherSnapshot): string {
  const temp = Number.isFinite(weather.temp) ? Math.round(weather.temp) : null;
  const condition = normalizeConditionText(weather.text ?? "");
  const factors = weatherFactorPhrases(weather);
  const tempClause = temp != null ? `气温 ${temp}°C` : "气温暂缺";
  if (factors.length > 0) {
    return `今天${condition}，${tempClause}，${factors.join("、")}。`;
  }
  return `今天${condition}，${tempClause}。`;
}

/** Age phrase for diaper / caregiver copy:「8 个月」「1 岁」「1 岁 6 个月」. */
export function formatAgePhrase(ageMonths: number): string {
  const months = Math.max(0, Math.floor(ageMonths));
  if (months < 12) return `${months} 个月`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} 岁`;
  return `${years} 岁 ${rem} 个月`;
}

/** UV intensity clause prefix, or null when copy should omit sunscreen. */
export function uvIntensityLabel(uvIndex: number): string | null {
  if (uvIndex < UV_MODERATE_THRESHOLD) return null;
  if (uvIndex < UV_OUTDOOR_THRESHOLD) return "紫外线中等强度";
  if (uvIndex < 8) return "紫外线较强";
  return "紫外线很强";
}

function joinLabels(labels: string[]): string {
  return labels.join("、");
}

function isUvGear(item: AdviceItem): boolean {
  return (
    item.kind === "category" &&
    item.category != null &&
    UV_OUTDOOR_CATEGORIES.has(item.category)
  );
}

function slotOf(item: AdviceItem): string | null {
  if (item.outfitSlot) return item.outfitSlot;
  return null;
}

function spokenLabel(raw: string): string {
  const label = raw.trim();
  const sep = " · ";
  const idx = label.indexOf(sep);
  return idx > 0 ? label.slice(0, idx).trim() : label;
}

function isBodysuitItem(item: AdviceItem): boolean {
  return item.category === "bodysuit_short" || item.category === "bodysuit_long";
}

/** 「脚上穿一双薄袜子」— never 「袜子穿袜子」. */
function socksClause(item: AdviceItem, kind: "hot" | "winter"): string {
  const phrase = garmentPhrase(item);
  if (kind === "winter") return `脚上再穿一双${phrase}。`;
  return `脚上穿一双${phrase}`;
}

/** Grounded garment phrase from checklist card (label + light material/feel). */
export function garmentPhrase(
  item: AdviceItem,
  opts?: { lightBottom?: boolean; lightTop?: boolean }
): string {
  let label = spokenLabel(item.label ?? "");
  if (!label) return "";

  if (item.material === "cotton" && !label.includes("棉")) {
    label = `纯棉${label.replace(/\s+/g, "")}`;
  }

  if (
    opts?.lightTop &&
    item.outfitSlot === "base_top" &&
    !label.includes("轻薄") &&
    !label.includes("薄")
  ) {
    label = `轻薄${label}`;
  }

  if (
    opts?.lightBottom &&
    item.outfitSlot === "bottom" &&
    !label.includes("轻薄") &&
    !label.includes("薄")
  ) {
    label = `轻薄透气的${label}`;
  }

  return label;
}

/** 贴身内层上衣：秋衣、包屁衣等。 */
function intimateBaseTopPhrase(item: AdviceItem): string {
  if (item.category === "thermal_top") return "纯棉的秋衣";
  return garmentPhrase(item);
}

/** 贴身内层下装：秋裤等。 */
function intimateBaseBottomPhrase(item: AdviceItem): string {
  if (item.category === "long_johns") return "纯棉秋裤";
  return garmentPhrase(item);
}

function outerWearPhrase(item: AdviceItem): string {
  const friendly =
    item.category != null ? FRIENDLY_OUTER_LABEL[item.category] : undefined;
  if (friendly) {
    const label = item.label?.trim() ?? "";
    if (label.includes("薄") && item.category === "outer_down") return "薄羽绒服";
    if (label.includes("厚") && item.category === "outer_cotton") return "厚棉服";
    return friendly;
  }
  const phrase = garmentPhrase(item);
  return phrase === "外套" ? "春秋外套" : phrase;
}

function itemsBySlot(
  items: AdviceItem[]
): Map<string, AdviceItem> {
  const map = new Map<string, AdviceItem>();
  for (const item of items) {
    if (item.kind !== "category") continue;
    const slot = slotOf(item);
    if (
      !slot ||
      slot === "hat" ||
      slot === "scarf" ||
      slot === "gloves" ||
      slot === "other" ||
      slot === "shoes"
    )
      continue;
    if (isUvGear(item) && item.category === "outer_uv") continue;
    if (isUvGear(item) && item.category === "hat") continue;
    if (!map.has(slot)) map.set(slot, item);
  }
  return map;
}

function wearClauses(
  heat: HeatSlot,
  indoorItems: AdviceItem[],
  outdoorAdditions: AdviceItem[]
): string[] {
  const bySlot = itemsBySlot([...indoorItems, ...outdoorAdditions]);
  const base = bySlot.get("base_top");
  const mid = bySlot.get("mid_top");
  const outer = bySlot.get("outer");
  const baseBottom = bySlot.get("base_bottom");
  const bottom = bySlot.get("bottom");
  const socks = bySlot.get("socks");

  const isHot = heat === "hot" || heat === "warm";
  const isWinter =
    heat === "cold" ||
    heat === "freezing" ||
    Boolean(mid && baseBottom);

  if (isWinter && base) {
    const topParts: string[] = [
      `最里面穿贴身${intimateBaseTopPhrase(base)}`,
    ];
    if (mid) topParts.push(`外面加一件${garmentPhrase(mid)}`);
    if (outer) topParts.push(`外套建议穿${outerWearPhrase(outer)}`);

    const lines = [`${topParts.join("，")}。`];

    if (baseBottom && bottom) {
      lines.push(
        `下身穿贴身${intimateBaseBottomPhrase(baseBottom)}加${garmentPhrase(bottom)}就可以啦。`
      );
    } else if (bottom) {
      lines.push(`下身穿${garmentPhrase(bottom)}就行。`);
    } else {
      lines.push("下身按清单搭配就行。");
    }

    if (socks) {
      lines.push(socksClause(socks, "winter"));
    }
    return lines;
  }

  if (isHot || (!mid && !outer)) {
    const lines: string[] = [];
    if (base) {
      const topPhrase = garmentPhrase(base, { lightTop: isHot });
      lines.push(
        isBodysuitItem(base) && !bottom
          ? `穿一件${topPhrase}`
          : `上身穿一件${topPhrase}`
      );
    }
    if (bottom) {
      lines.push(`下身搭条${garmentPhrase(bottom, { lightBottom: isHot })}`);
    }
    if (lines.length === 0) return ["建议按家里清单穿着。"];
    if (socks && !bottom) {
      lines.push(socksClause(socks, "hot"));
    }
    lines[lines.length - 1] = `${lines[lines.length - 1]}就可以啦。`;
    return lines;
  }

  const lines: string[] = [];
  if (base) lines.push(`最里面穿${garmentPhrase(base)}`);
  if (mid) lines.push(`外面加一件${garmentPhrase(mid)}`);
  if (outer) lines.push(`外套建议穿${outerWearPhrase(outer)}`);
  if (bottom) {
    const phrase = garmentPhrase(bottom);
    lines.push(phrase === "裤子" ? `下身穿${phrase}就行` : `裤子穿${phrase}就行`);
  }
  if (lines.length === 0) return ["建议按家里清单穿着。"];
  lines[lines.length - 1] = `${lines[lines.length - 1]}。`;
  return lines;
}

function wearSentence(
  heat: HeatSlot,
  indoorItems: AdviceItem[],
  outdoorAdditions: AdviceItem[]
): string {
  const lines = wearClauses(heat, indoorItems, outdoorAdditions);
  if (lines.length <= 1) return lines[0] ?? "";
  if (lines.every((l) => l.endsWith("。"))) return lines.join("");
  const last = lines[lines.length - 1] ?? "";
  if (last.includes("就可以啦") || last.includes("就行")) {
    return `${lines.slice(0, -1).join("，")}，${last}`;
  }
  return lines.join("，");
}

function uvSentence(
  weather: WeatherSnapshot,
  outdoorAdditions: AdviceItem[]
): string | null {
  const intensity = uvIntensityLabel(weather.uvIndex ?? 0);
  if (!intensity) return null;
  const labels = outdoorAdditions
    .filter(isUvGear)
    .map((i) => i.label)
    .filter(Boolean);
  if (labels.length > 0) {
    return `${intensity}，出门可以佩戴${joinLabels(labels)}做好防晒工作。`;
  }
  return `${intensity}，出门注意防晒。`;
}

function rainSentence(rain: RainSlot): string | null {
  if (rain === "raining") {
    return `${ADVICE_COPY.rainRaining}，${ADVICE_COPY.rainGearClause}。`;
  }
  if (rain === "likely") {
    return `${ADVICE_COPY.rainLikely}，${ADVICE_COPY.rainGearClause}。`;
  }
  return null;
}

function coldAccessorySentence(
  heat: HeatSlot,
  outdoorAdditions: AdviceItem[]
): string | null {
  if (heat !== "cold" && heat !== "freezing") return null;
  const labels = outdoorAdditions
    .filter(
      (i) =>
        i.kind === "category" &&
        i.category != null &&
        COLD_ACCESSORY_CATEGORIES.has(i.category) &&
        i.category !== "outer_uv"
    )
    .filter((i) => !(i.category === "hat" && i.label.includes("遮阳")))
    .map((i) => i.label)
    .filter(Boolean);
  if (labels.length === 0) return null;
  return `出门记得戴上${joinLabels(labels)}。`;
}

export interface FormatAdviceConclusionInput {
  weather: WeatherSnapshot;
  requiredWarmth: number;
  indoorItems: AdviceItem[];
  outdoorAdditions: AdviceItem[];
  /** Whole months since birth; drives diaper sentence. Default 0. */
  ageMonths?: number;
  /** Profile diaper status; false suppresses diaper copy. */
  wearsDiaper?: boolean | null;
}

export type AdviceConclusionBlockKind =
  | "weather"
  | "diaper"
  | "wear"
  | "uv"
  | "rain"
  | "accessory";

export interface AdviceConclusionBlock {
  kind: AdviceConclusionBlockKind;
  lines: string[];
  text: string;
}

function conclusionBlock(
  kind: AdviceConclusionBlockKind,
  lines: string[]
): AdviceConclusionBlock {
  const normalized = lines.map((l) => l.trim()).filter(Boolean);
  return { kind, lines: normalized, text: normalized.join("") };
}

/** Structured blocks for UI; flat join equals formatAdviceConclusion. */
export function formatAdviceConclusionBlocks(
  input: FormatAdviceConclusionInput
): AdviceConclusionBlock[] {
  const {
    weather,
    requiredWarmth,
    indoorItems,
    outdoorAdditions,
    ageMonths = 0,
    wearsDiaper = null,
  } = input;
  const heat = heatFromRequiredWarmth(requiredWarmth);
  const rain = rainFromWeather(weather);
  const diaperLine = diaperAdviceSentence(ageMonths, wearsDiaper);
  const blocks: AdviceConclusionBlock[] = [
    conclusionBlock("weather", [weatherSummarySentence(weather)]),
    {
      kind: "wear",
      lines: wearClauses(heat, indoorItems, outdoorAdditions),
      text: wearSentence(heat, indoorItems, outdoorAdditions),
    },
  ];

  if (diaperLine) {
    blocks.splice(1, 0, conclusionBlock("diaper", [diaperLine]));
  }

  const uv = uvSentence(weather, outdoorAdditions);
  if (uv) blocks.push(conclusionBlock("uv", [uv]));

  const rainLine = rainSentence(rain);
  if (rainLine) blocks.push(conclusionBlock("rain", [rainLine]));

  const accessories = coldAccessorySentence(heat, outdoorAdditions);
  if (accessories) blocks.push(conclusionBlock("accessory", [accessories]));

  return blocks;
}

/**
 * §2.2 conclusion paragraph — grounded onion / age / UV / rain prompt.
 * See docs/specs/home-daily-brief.md §2.2
 */
export function formatAdviceConclusion(
  input: FormatAdviceConclusionInput
): string {
  return formatAdviceConclusionBlocks(input)
    .map((b) => b.text)
    .join("");
}

/** @deprecated Prefer formatAdviceConclusion. */
export function formatAdviceHeadline(slots: AdviceCopySlots): string {
  const heat =
    slots.heat === "hot" || slots.heat === "warm"
      ? "家里短袖就够。"
      : slots.heat === "mild"
        ? "家里穿好打底。"
        : slots.heat === "cool"
          ? "家里要穿暖和些。"
          : "家里也要保暖。";
  if (slots.rain === "raining") return `${heat}${ADVICE_COPY.rainRaining}。`;
  if (slots.rain === "likely") return `${heat}${ADVICE_COPY.rainLikely}。`;
  if (slots.uv === "high") return `${heat}出门注意防晒。`;
  return heat;
}

function itemIds(items: AdviceItem[]): string[] {
  return [...items.map((i) => i.id)].sort();
}

function extraKeys(extras: AdviceExtra[]): string[] {
  return [...extras.map((e) => e.type)].sort();
}

/** Stable fingerprint of indoor + outdoor + extras + tip tags (ids/types only). */
export function adviceFingerprint(advice: DressingAdvice): string {
  return [
    itemIds(advice.indoorItems).join(","),
    itemIds(advice.outdoorAdditions).join(","),
    extraKeys(advice.extras).join(","),
    [...(advice.tags ?? []).map((t) => t.code)].sort().join(","),
  ].join("|");
}

export function formatAdviceCopy(input: FormatAdviceConclusionInput): FormattedAdviceCopy {
  return {
    blockTitle: ADVICE_COPY.blockTitleNow,
    headline: formatAdviceConclusion(input),
    indoorHeading: ADVICE_COPY.indoorHeading,
    outdoorHeading: ADVICE_COPY.outdoorHeading,
    extrasHeading: ADVICE_COPY.extrasHeading,
    emptyOutdoor: ADVICE_COPY.emptyOutdoor,
  };
}
