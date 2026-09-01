import { fetchWeather, type WeatherFetch, type WeatherResult } from "@warmrobot/core";
import type { DbProfile } from "@/lib/db/types";
import { hasValidCoordinates } from "@/lib/geo";

/** 无 profile 坐标时的默认：北京 */
export const DEFAULT_WEATHER_LOCATION = {
  latitude: 39.9042,
  longitude: 116.4074,
  city: "北京",
} as const;

/** Next.js 服务端缓存 30 分钟，避免频繁打 Open-Meteo */
const cachedFetch: WeatherFetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: 1800 } });

export interface ProfileWeatherInput {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

function resolveWeatherLocation(
  latitude?: number | string | null,
  longitude?: number | string | null,
  city?: string | null
) {
  const hasCoords = hasValidCoordinates(latitude, longitude);
  if (hasCoords || city?.trim()) {
    return {
      latitude: hasCoords ? Number(latitude) : null,
      longitude: hasCoords ? Number(longitude) : null,
      city,
    };
  }
  return {
    latitude: DEFAULT_WEATHER_LOCATION.latitude,
    longitude: DEFAULT_WEATHER_LOCATION.longitude,
    city: DEFAULT_WEATHER_LOCATION.city,
  };
}

/** 从 profile 解析位置并拉取天气，失败返回 null */
export async function getWeatherForProfile(
  profile: Pick<DbProfile, "city" | "latitude" | "longitude"> | null | undefined,
  options?: { at?: string | null }
): Promise<WeatherResult | null> {
  try {
    return await fetchWeather(
      {
        ...resolveWeatherLocation(profile?.latitude, profile?.longitude, profile?.city),
        at: options?.at,
      },
      cachedFetch
    );
  } catch (error) {
    console.error("[getWeatherForProfile]", error);
    return null;
  }
}

/** 供 /api/weather 使用：支持 query 或 profile 回退 */
export async function getWeatherFromQuery(
  params: {
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    at?: string | null;
  },
  profile?: ProfileWeatherInput | null
): Promise<WeatherResult> {
  const lat = params.latitude ?? profile?.latitude;
  const lng = params.longitude ?? profile?.longitude;
  const city = params.city ?? profile?.city;
  return fetchWeather(
    { ...resolveWeatherLocation(lat, lng, city), at: params.at },
    cachedFetch
  );
}

export function weatherCityLabel(
  profile: Pick<DbProfile, "city"> | null | undefined,
  weather: WeatherResult | null
): string | null {
  if (profile?.city?.trim()) return profile.city.trim();
  if (weather?.location.name) return weather.location.name;
  return null;
}
