import { NextResponse } from "next/server";
import { fetchWeather, type WeatherResult } from "@warmrobot/core";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { createClient } from "@/lib/supabase/server";

const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: 1800 } });

function isValidCoord(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
}

/**
 * POST /api/profile/location
 * Body: { latitude, longitude } 或 { city }
 * 逆地理 / 正地理 → 拉天气 → 写入 profiles
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody<{
    latitude?: number;
    longitude?: number;
    city?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const city = typeof body.city === "string" ? body.city.trim() : "";
  const { latitude, longitude } = body;
  const hasCoords = isValidCoord(latitude) && isValidCoord(longitude);
  if (hasCoords) {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "经纬度超出有效范围" }, { status: 400 });
    }
  } else if (!city || city.length > 80) {
    return NextResponse.json({ error: "请提供有效的地点" }, { status: 400 });
  }

  let weather: WeatherResult;
  try {
    weather = await fetchWeather(
      hasCoords ? { latitude, longitude } : { city },
      cachedFetch
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "天气获取失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      city: weather.location.name,
      latitude: weather.location.latitude,
      longitude: weather.location.longitude,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(weather);
}
