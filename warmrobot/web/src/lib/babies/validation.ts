/** Calendar dates must be real dates, not JavaScript's normalized overflow dates. */
export function isValidBabyBirthDate(value: unknown, now = new Date()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  return value >= "1900-01-01" && value <= today;
}

export function isValidBabyName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

export function isValidBabyId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
