import type {
  AdviceExtra,
  AdviceItem,
  DressingAdvice,
  HomeDailyBriefWeather,
} from "./daily-brief-types";

/** Persisted indoor / outdoor / extras snapshot — weather tip tags are not stored. */
export interface DressingRecordOutfit {
  indoorItems: AdviceItem[];
  outdoorAdditions: AdviceItem[];
  extras: AdviceExtra[];
}

export interface DressingRecord {
  id?: string;
  babyId: string;
  babyName: string;
  recordedDate: string;
  savedAt: string;
  requiredWarmth: number;
  reason: string;
  locationLabel?: string;
  weather?: HomeDailyBriefWeather;
  outfit: DressingRecordOutfit;
}

export type SaveDressingRecordAdvice = Pick<
  DressingAdvice,
  "indoorItems" | "outdoorAdditions" | "extras" | "reason" | "requiredWarmth"
>;

export type SaveDressingRecordInput = {
  babyId: string;
  babyName: string;
  advice: SaveDressingRecordAdvice;
  weather?: HomeDailyBriefWeather;
};

export type ParseSaveResult =
  | { ok: true; data: SaveDressingRecordInput }
  | { ok: false; error: string };

export type OutfitSummary = {
  indoor: string;
  outdoor: string;
  extras: string;
};

const MAX_ZONE_ITEMS = 40;
const MAX_LABEL_LEN = 80;

export type DressingRecordRow = {
  id: string;
  user_id: string;
  baby_id: string;
  baby_name: string;
  recorded_date: string;
  saved_at: string;
  required_warmth: number;
  reason: string | null;
  location_label: string | null;
  weather: HomeDailyBriefWeather | null;
  outfit: DressingRecordOutfit;
};

export function dressingRecordIdentityKey(babyId: string, recordedDate: string): string {
  return `${babyId}:${recordedDate}`;
}

export function localCalendarDate(
  date = new Date(),
  timeZone = "Asia/Shanghai"
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/** 今天 / 昨天 / 8月20日 / 2025年12月31日 */
export function formatRecordedDateLabel(
  recordedDate: string,
  now = new Date(),
  timeZone = "Asia/Shanghai"
): string {
  const today = localCalendarDate(now, timeZone);
  if (recordedDate === today) return "今天";
  if (recordedDate === addCalendarDays(today, -1)) return "昨天";
  const [year, month, day] = recordedDate.split("-").map(Number);
  if (!year || !month || !day) return recordedDate;
  const todayYear = Number(today.slice(0, 4));
  if (year !== todayYear) return `${year}年${month}月${day}日`;
  return `${month}月${day}日`;
}

function cloneItem(item: AdviceItem): AdviceItem {
  return { ...item };
}

function cloneExtra(extra: AdviceExtra): AdviceExtra {
  return extra.item ? { ...extra, item: cloneItem(extra.item) } : { ...extra };
}

function cloneOutfit(advice: SaveDressingRecordAdvice): DressingRecordOutfit {
  return {
    indoorItems: advice.indoorItems.map(cloneItem),
    outdoorAdditions: advice.outdoorAdditions.map(cloneItem),
    extras: advice.extras.map(cloneExtra),
  };
}

export function buildDressingRecordFromAdvice(input: {
  babyId: string;
  babyName: string;
  recordedDate: string;
  savedAt?: string;
  advice: SaveDressingRecordAdvice;
  weather?: HomeDailyBriefWeather;
}): DressingRecord {
  return {
    babyId: input.babyId,
    babyName: input.babyName,
    recordedDate: input.recordedDate,
    savedAt: input.savedAt ?? new Date().toISOString(),
    requiredWarmth: input.advice.requiredWarmth,
    reason: input.advice.reason ?? "",
    locationLabel: input.weather?.locationLabel,
    weather: input.weather ? { ...input.weather } : undefined,
    outfit: cloneOutfit(input.advice),
  };
}

function joinLabels(labels: string[]): string {
  return labels.filter((label) => label.trim().length > 0).join("、");
}

export function summarizeOutfit(outfit: DressingRecordOutfit): OutfitSummary {
  return {
    indoor: joinLabels(outfit.indoorItems.map((item) => item.label)),
    outdoor: joinLabels(outfit.outdoorAdditions.map((item) => item.label)),
    extras: joinLabels(outfit.extras.map((extra) => extra.item?.label ?? extra.type)),
  };
}

export function mapDressingRecordRow(
  row: DressingRecordRow
): DressingRecord & { id: string } {
  return {
    id: row.id,
    babyId: row.baby_id,
    babyName: row.baby_name,
    recordedDate: row.recorded_date,
    savedAt: row.saved_at,
    requiredWarmth: Number(row.required_warmth),
    reason: row.reason ?? "",
    locationLabel: row.location_label ?? undefined,
    weather: row.weather ?? undefined,
    outfit: row.outfit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseAdviceItem(value: unknown): AdviceItem | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  if ((kind !== "tip" && kind !== "category") || !id || !label) return null;
  if (label.length > MAX_LABEL_LEN) return null;
  const item: AdviceItem = { kind, id, label };
  if (typeof value.labelEn === "string" && value.labelEn.trim()) {
    item.labelEn = value.labelEn.trim().slice(0, MAX_LABEL_LEN);
  }
  if (typeof value.subtitle === "string" && value.subtitle.trim()) {
    item.subtitle = value.subtitle.trim().slice(0, MAX_LABEL_LEN);
  }
  if (typeof value.category === "string" && value.category.trim()) {
    item.category = value.category.trim() as AdviceItem["category"];
  }
  if (typeof value.warmthValue === "number" && Number.isFinite(value.warmthValue)) {
    item.warmthValue = Math.round(value.warmthValue);
  }
  return item;
}

function parseExtra(value: unknown): AdviceExtra | null {
  if (!isRecord(value)) return null;
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const reason = typeof value.reason === "string" ? value.reason : "";
  if (!type) return null;
  const extra: AdviceExtra = { type, reason };
  if (value.item != null) {
    const item = parseAdviceItem(value.item);
    if (!item) return null;
    extra.item = item;
  }
  return extra;
}

function parseItemArray(value: unknown): AdviceItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_ZONE_ITEMS) return null;
  const items: AdviceItem[] = [];
  for (const entry of value) {
    const item = parseAdviceItem(entry);
    if (!item) return null;
    items.push(item);
  }
  return items;
}

function parseExtraArray(value: unknown): AdviceExtra[] | null {
  if (!Array.isArray(value) || value.length > MAX_ZONE_ITEMS) return null;
  const extras: AdviceExtra[] = [];
  for (const entry of value) {
    const extra = parseExtra(entry);
    if (!extra) return null;
    extras.push(extra);
  }
  return extras;
}

function parseWeather(value: unknown): HomeDailyBriefWeather | undefined | null {
  if (value == null) return undefined;
  if (!isRecord(value)) return null;
  const temp = Number(value.temp);
  const feelsLike = Number(value.feelsLike);
  const windSpeed = Number(value.windSpeed);
  const humidity = Number(value.humidity);
  const uvIndex = Number(value.uvIndex);
  if (
    !Number.isFinite(temp) ||
    !Number.isFinite(feelsLike) ||
    !Number.isFinite(windSpeed) ||
    !Number.isFinite(humidity) ||
    !Number.isFinite(uvIndex)
  ) {
    return null;
  }
  const weather: HomeDailyBriefWeather = {
    observedAt: typeof value.observedAt === "string" ? value.observedAt : "",
    locationLabel: typeof value.locationLabel === "string" ? value.locationLabel : "",
    conditionText: typeof value.conditionText === "string" ? value.conditionText : "",
    temp,
    feelsLike,
    windSpeed,
    humidity,
    uvIndex,
  };
  if (value.precipProbability != null) {
    const precip = Number(value.precipProbability);
    if (Number.isFinite(precip)) weather.precipProbability = precip;
  }
  return weather;
}

export function parseSaveDressingRecordInput(body: unknown): ParseSaveResult {
  if (!isRecord(body)) {
    return { ok: false, error: "无法保存：请求格式不正确" };
  }

  const babyId = typeof body.babyId === "string" ? body.babyId.trim() : "";
  if (!babyId) {
    return { ok: false, error: "无法保存：缺少宝宝档案" };
  }

  const babyName = typeof body.babyName === "string" ? body.babyName.trim() : "";

  if (!isRecord(body.advice)) {
    return { ok: false, error: "无法保存：缺少穿搭清单" };
  }

  const requiredWarmth = Number(body.advice.requiredWarmth);
  if (!Number.isFinite(requiredWarmth)) {
    return { ok: false, error: "无法保存：穿衣指数无效" };
  }

  const indoorItems = parseItemArray(body.advice.indoorItems);
  const outdoorAdditions = parseItemArray(body.advice.outdoorAdditions);
  const extras = parseExtraArray(body.advice.extras ?? []);
  if (!indoorItems || !outdoorAdditions || !extras) {
    return { ok: false, error: "无法保存：清单内容无效" };
  }

  const weather = parseWeather(body.weather);
  if (weather === null) {
    return { ok: false, error: "无法保存：天气快照无效" };
  }

  const reason =
    typeof body.advice.reason === "string" ? body.advice.reason.slice(0, 500) : undefined;

  return {
    ok: true,
    data: {
      babyId,
      babyName,
      advice: {
        indoorItems,
        outdoorAdditions,
        extras,
        reason,
        requiredWarmth,
      },
      weather,
    },
  };
}
