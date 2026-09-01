import type { WeatherSnapshot } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_GEOCODE_URL =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

/** WMO weather interpretation codes → 中文 */
const WMO_TEXT: Record<number, string> = {
  0: "晴",
  1: "多云",
  2: "阴",
  3: "阴",
  45: "雾",
  48: "雾",
  51: "小雨",
  53: "中雨",
  55: "大雨",
  56: "冻雨",
  57: "冻雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "阵雪",
  95: "雷雨",
  96: "雷雨",
  99: "雷雨",
};

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "wind_speed_10m",
  "surface_pressure",
  "weather_code",
  "precipitation_probability",
  "uv_index",
].join(",");

export interface GeoLocation {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
}

/** Open-Meteo geocoding hit with list-friendly subtitle. */
export interface PlaceSearchHit extends GeoLocation {
  admin2?: string;
  subtitle: string;
}

export interface HourlyWeatherSeries {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  surface_pressure?: number[];
  weather_code: number[];
  precipitation_probability?: number[];
  uv_index?: number[];
}

export interface WeatherLocationInput {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  /** Local hour key `YYYY-MM-DDTHH`; omit for current conditions. */
  at?: string | null;
}

export interface WeatherResult extends WeatherSnapshot {
  location: GeoLocation;
  fetchedAt: string;
}

export type WeatherFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

function hasValidCoords(lat?: number | null, lng?: number | null): lat is number {
  return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
}

function locationLabel(hit: {
  name: string;
  admin1?: string;
  country?: string;
}): string {
  if (hit.admin1 && hit.admin1 !== hit.name) {
    return `${hit.name}（${hit.admin1}）`;
  }
  return hit.name;
}

export function formatPlaceSubtitle(hit: {
  name: string;
  admin1?: string;
  admin2?: string;
  country?: string;
}): string {
  const parts = [hit.admin2, hit.admin1, hit.country]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0 && part !== hit.name);
  const unique = [...new Set(parts)];
  return unique.join(" · ");
}

/** Normalize `YYYY-MM-DDTHH:00` / `YYYY-MM-DDTHH` to hour key. */
export function hourKeyFromIso(isoOrHourKey: string): string | null {
  const match = isoOrHourKey.trim().match(/^(\d{4}-\d{2}-\d{2}T\d{2})/);
  return match ? match[1] : null;
}

function readHourlyNumber(series: number[] | undefined, index: number, fallback = 0): number {
  const value = series?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Pick the hourly row whose time matches `at` (`YYYY-MM-DDTHH`). */
export function snapshotFromHourly(
  hourly: HourlyWeatherSeries,
  atHourKey: string
): WeatherSnapshot | null {
  const target = hourKeyFromIso(atHourKey);
  if (!target || !hourly.time?.length) return null;

  const index = hourly.time.findIndex((time) => hourKeyFromIso(time) === target);
  if (index < 0) return null;

  const code = hourly.weather_code[index];
  return {
    temp: readHourlyNumber(hourly.temperature_2m, index),
    feelsLike: readHourlyNumber(hourly.apparent_temperature, index, readHourlyNumber(hourly.temperature_2m, index)),
    humidity: readHourlyNumber(hourly.relative_humidity_2m, index),
    windSpeed: readHourlyNumber(hourly.wind_speed_10m, index),
    pressure: readHourlyNumber(hourly.surface_pressure, index, 1013),
    text: WMO_TEXT[code] ?? "未知",
    precipProbability: hourly.precipitation_probability?.[index],
    uvIndex: hourly.uv_index?.[index],
    observedAt: hourly.time[index],
  };
}

type ReverseAdmin = { name?: string; description?: string; order?: number; isoName?: string };

function pickCityName(data: {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
}): string {
  const city = data.city?.trim() || data.locality?.trim();
  if (!city) return "当前位置";

  const region = data.principalSubdivision?.trim();
  if (region && region !== city && !city.includes(region.replace(/(省|市|自治区)$/, ""))) {
    const shortRegion = region.replace(/(省|市|自治区|特别行政区)$/, "");
    return `${city}（${shortRegion}）`;
  }
  return city;
}

/**
 * Prefer town-level Chinese label (省市区镇) when BigDataCloud localityInfo is present.
 * Falls back honestly to city/district when town is unavailable.
 */
export function formatTownLevelLocationLabel(data: {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  localityInfo?: { administrative?: ReverseAdmin[] };
}): string {
  const admins = (data.localityInfo?.administrative ?? [])
    .filter((a) => a.name?.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (admins.length > 0) {
    const names = admins.map((a) => a.name!.trim());
    // Drop country-level if present as first
    const withoutCountry = names.filter(
      (n) => n !== data.countryName?.trim() && !/中国|中华人民共和国/.test(n)
    );
    const parts = withoutCountry.length ? withoutCountry : names;
    // Keep up to 省 + 市 + 区 + 镇 (4)
    const label = parts.slice(0, 4).join("");
    if (label) return label;
  }

  const fallback = pickCityName(data);
  if (fallback === "当前位置") return fallback;
  return `${fallback}（未精确到镇）`;
}

/** 经纬度 → 城市名（BigDataCloud 免费逆地理编码，无需 Key） */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  fetchImpl: WeatherFetch = fetch
): Promise<GeoLocation> {
  const url = new URL(REVERSE_GEOCODE_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "zh");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`Reverse geocoding failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
    localityInfo?: { administrative?: ReverseAdmin[] };
  };

  return {
    latitude,
    longitude,
    name: formatTownLevelLocationLabel(data),
    country: data.countryName,
    admin1: data.principalSubdivision,
  };
}

type GeocodingHit = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
};

async function fetchGeocodingHits(
  query: string,
  count: number,
  fetchImpl: WeatherFetch
): Promise<GeocodingHit[]> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`Geocoding API failed: ${res.status}`);
  }

  const data = (await res.json()) as { results?: GeocodingHit[] };
  return data.results ?? [];
}

function toPlaceSearchHit(hit: GeocodingHit): PlaceSearchHit {
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: hit.name,
    country: hit.country,
    admin1: hit.admin1,
    admin2: hit.admin2,
    subtitle: formatPlaceSubtitle(hit),
  };
}

/** 地名搜索（城市 / 区 / 镇），返回多条候选。 */
export async function searchPlaces(
  query: string,
  options: { count?: number } = {},
  fetchImpl: WeatherFetch = fetch
): Promise<PlaceSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const count = Math.min(Math.max(options.count ?? 8, 1), 12);
  const hits = await fetchGeocodingHits(trimmed, count, fetchImpl);
  return hits.map(toPlaceSearchHit);
}

/** 城市名 → 经纬度（Open-Meteo Geocoding，免费无需 Key） */
export async function geocodeCity(
  city: string,
  fetchImpl: WeatherFetch = fetch
): Promise<GeoLocation> {
  const query = city.trim();
  if (!query) {
    throw new Error("城市名不能为空");
  }

  const hit = (await fetchGeocodingHits(query, 1, fetchImpl))[0];
  if (!hit) {
    throw new Error(`未找到城市：${query}`);
  }

  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: locationLabel(hit),
    country: hit.country,
    admin1: hit.admin1,
  };
}

type CurrentWeatherPayload = {
  time?: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  surface_pressure: number;
  weather_code: number;
  precipitation_probability?: number;
  uv_index?: number;
};

function snapshotFromCurrent(c: CurrentWeatherPayload): WeatherSnapshot {
  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    pressure: c.surface_pressure,
    text: WMO_TEXT[c.weather_code] ?? "未知",
    precipProbability: c.precipitation_probability,
    uvIndex: c.uv_index,
    observedAt: c.time,
  };
}

/** 经纬度 → 当前天气（Open-Meteo）；`at` 时取对应小时预报。 */
export async function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  fetchImpl: WeatherFetch = fetch,
  options?: { at?: string | null }
): Promise<WeatherSnapshot> {
  const atHourKey = options?.at ? hourKeyFromIso(options.at) : null;

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_VARS);
  url.searchParams.set("timezone", "auto");
  if (atHourKey) {
    url.searchParams.set("hourly", CURRENT_VARS);
    url.searchParams.set("forecast_days", "2");
  }

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`Weather API failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    current?: CurrentWeatherPayload;
    hourly?: HourlyWeatherSeries;
  };

  if (atHourKey && data.hourly) {
    const hourlySnapshot = snapshotFromHourly(data.hourly, atHourKey);
    if (hourlySnapshot) return hourlySnapshot;
  }

  const c = data.current;
  if (!c) {
    throw new Error("Weather API returned no current data");
  }

  return snapshotFromCurrent(c);
}

/**
 * 统一入口：优先用经纬度，否则按城市 geocode，再拉 forecast。
 */
export async function fetchWeather(
  input: WeatherLocationInput,
  fetchImpl: WeatherFetch = fetch
): Promise<WeatherResult> {
  let location: GeoLocation;

  if (hasValidCoords(input.latitude, input.longitude)) {
    const lat = Number(input.latitude);
    const lng = Number(input.longitude);
    location = input.city?.trim()
      ? { latitude: lat, longitude: lng, name: input.city.trim() }
      : await reverseGeocode(lat, lng, fetchImpl);
  } else if (input.city?.trim()) {
    location = await geocodeCity(input.city, fetchImpl);
  } else {
    throw new Error("请提供经纬度或城市名");
  }

  const snapshot = await fetchWeatherByCoords(
    location.latitude,
    location.longitude,
    fetchImpl,
    { at: input.at }
  );

  return {
    ...snapshot,
    location,
    fetchedAt: new Date().toISOString(),
  };
}

/** @deprecated 使用 fetchWeatherByCoords */
export async function fetchWeatherOpenMeteo(params: {
  latitude: number;
  longitude: number;
}): Promise<WeatherSnapshot> {
  return fetchWeatherByCoords(params.latitude, params.longitude);
}
