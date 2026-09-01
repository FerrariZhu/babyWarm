import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeatherFromQuery } from "@/lib/weather";

/**
 * GET /api/weather
 * Query: ?city=上海  或  ?lat=31.23&lng=121.47
 * 未传参数时使用登录用户 profile 中的 city / 坐标。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
  const lngParam = searchParams.get("lng") ?? searchParams.get("longitude");
  const at = searchParams.get("at");

  const latitude = latParam != null ? Number(latParam) : null;
  const longitude = lngParam != null ? Number(lngParam) : null;

  let profile: { city?: string | null; latitude?: number | null; longitude?: number | null } | null =
    null;

  if (!city && latitude == null && longitude == null) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("city, latitude, longitude")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    }
  }

  try {
    const weather = await getWeatherFromQuery(
      {
        city,
        latitude: latitude != null && !Number.isNaN(latitude) ? latitude : null,
        longitude: longitude != null && !Number.isNaN(longitude) ? longitude : null,
        at,
      },
      profile
    );

    return NextResponse.json(weather);
  } catch (error) {
    const message = error instanceof Error ? error.message : "天气获取失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
