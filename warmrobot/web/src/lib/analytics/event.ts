export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "module_impression",
  "module_click",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsEvent = {
  eventType: AnalyticsEventType;
  pagePath: string;
  moduleName: string | null;
  actionName: string | null;
  visitorId: string;
};

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const PAGE_PATH_PATTERN = /^\/(?:[a-z0-9_/-]{0,127})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER_PATTERN.test(value);
}

function isPagePath(value: unknown): value is string {
  return typeof value === "string" && PAGE_PATH_PATTERN.test(value);
}

function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isAnalyticsEventType(value: unknown): value is AnalyticsEventType {
  return ANALYTICS_EVENT_TYPES.includes(value as AnalyticsEventType);
}

export function parseAnalyticsEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const eventType = value.eventType;

  if (!isAnalyticsEventType(eventType)) return null;
  if (!isPagePath(value.pagePath) || !isVisitorId(value.visitorId)) return null;

  const moduleName = value.moduleName == null ? null : value.moduleName;
  const actionName = value.actionName == null ? null : value.actionName;
  if (moduleName !== null && !isIdentifier(moduleName)) return null;
  if (actionName !== null && !isIdentifier(actionName)) return null;

  if (eventType === "page_view") {
    if (moduleName !== null || actionName !== null) return null;
  } else if (moduleName === null || actionName === null) {
    return null;
  }

  return { eventType, pagePath: value.pagePath, moduleName, actionName, visitorId: value.visitorId };
}
