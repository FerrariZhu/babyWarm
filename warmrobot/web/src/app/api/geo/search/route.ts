import { NextResponse } from "next/server";
import { searchPlaces } from "@warmrobot/core";
import { createClient } from "@/lib/supabase/server";

const MAX_QUERY_LENGTH = 80;

/**
 * GET /api/geo/search?q=南翔
 * Authenticated place search via Open-Meteo geocoding.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "搜索词过长" }, { status: 400 });
  }

  try {
    const results = await searchPlaces(query, { count: 8 });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "地点搜索失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
