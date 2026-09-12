"use server";

import { buildAnalyticsDashboard, type AnalyticsDailyUvRow } from "@/lib/admin/analytics-dashboard";
import { query } from "@/lib/self-hosted/database";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    dates.push(toIsoDate(date));
  }
  return dates;
}

export async function getAnalyticsDashboard(days: number) {
  const dates = dateRange(days);
  try {
    const data = await query<AnalyticsDailyUvRow>(
      `SELECT occurred_at::date::text AS event_date,
              event_type,
              page_path,
              module_name,
              action_name,
              count(DISTINCT visitor_id)::integer AS uv
         FROM public.analytics_events
        WHERE occurred_at >= $1::date
          AND occurred_at < ($2::date + interval '1 day')
        GROUP BY 1, 2, 3, 4, 5`,
      [dates[0], dates[dates.length - 1]]
    );
    return { ok: true as const, data: buildAnalyticsDashboard(data, dates) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "无法加载分析数据" };
  }
}
