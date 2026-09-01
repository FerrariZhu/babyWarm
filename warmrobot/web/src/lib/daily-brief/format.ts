import type { HomeDailyBrief } from "@warmrobot/core";

/** Calendar date YYYY-MM-DD in app timezone (China product default). */
export function localRecommendedDate(
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

/** Product display: 2026年8月20日 14时 */
export function formatObservedAtDisplay(isoOrLocal: string): string {
  const m = isoOrLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
  if (m) {
    return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日 ${Number(m[4])}时`;
  }

  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return isoOrLocal;

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}年${get("month")}月${get("day")}日 ${get("hour")}时`;
}

export const BRIEF_WEATHER_TTL_MS = 30 * 60 * 1000;

export function isBriefStale(brief: HomeDailyBrief, now = Date.now()): boolean {
  const generated = Date.parse(brief.generatedAt);
  if (Number.isNaN(generated)) return true;
  return now - generated > BRIEF_WEATHER_TTL_MS;
}

/** `YYYY-MM-DDTHH` from query (`…T14` or `…T14:00`). */
export function parseHourQuery(value?: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2}T)(\d{2})(?::00)?$/);
  if (!match) return null;
  const hour = Number(match[2]);
  if (hour < 0 || hour > 23) return null;
  return `${match[1]}${match[2]}`;
}

export function currentHourKey(now = new Date(), timeZone = "Asia/Shanghai"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function isHourKeyCurrent(hourKey: string, now = new Date()): boolean {
  return hourKey === currentHourKey(now);
}

export function isHourKeySelectable(hourKey: string, now = new Date()): boolean {
  const today = localRecommendedDate(now);
  const min = `${today}T00`;
  const max = `${addCalendarDays(today, 1)}T23`;
  return hourKey >= min && hourKey <= max;
}

/** Compact chip: 今天 14时 / 明天 9时 / 8月27日 14时 */
export function formatHourChipDisplay(isoOrHourKey: string, now = new Date()): string {
  const match = isoOrHourKey.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
  if (!match) return formatObservedAtDisplay(isoOrHourKey);
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const hourLabel = `${Number(match[4])}时`;
  const today = localRecommendedDate(now);
  if (date === today) return `今天 ${hourLabel}`;
  if (date === addCalendarDays(today, 1)) return `明天 ${hourLabel}`;
  return `${Number(match[2])}月${Number(match[3])}日 ${hourLabel}`;
}

export function resolveHourOverride(at?: string | null, now = new Date()): string | null {
  const hourKey = parseHourQuery(at);
  if (!hourKey) return null;
  if (!isHourKeySelectable(hourKey, now)) return null;
  if (isHourKeyCurrent(hourKey, now)) return null;
  return hourKey;
}
