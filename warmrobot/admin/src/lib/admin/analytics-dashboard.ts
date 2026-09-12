export type AnalyticsDailyUvRow = {
  event_date: string;
  event_type: "page_view" | "module_impression" | "module_click";
  page_path: string;
  module_name: string | null;
  action_name: string | null;
  uv: number;
};

export type AnalyticsDashboard = {
  summary: {
    pageViews: number;
    moduleImpressions: number;
    moduleClicks: number;
    clickThroughRate: number;
  };
  trend: Array<{ date: string; pageViews: number; moduleImpressions: number; moduleClicks: number }>;
  pages: Array<{ path: string; pageViews: number }>;
  modules: Array<{ path: string; name: string; impressions: number; clicks: number; clickThroughRate: number }>;
};

function roundedRate(clicks: number, impressions: number): number {
  return impressions === 0 ? 0 : Number(((clicks / impressions) * 100).toFixed(1));
}

export function buildAnalyticsDashboard(
  rows: AnalyticsDailyUvRow[],
  dates: string[]
): AnalyticsDashboard {
  const daily = new Map(dates.map((date) => [date, { pageViews: 0, moduleImpressions: 0, moduleClicks: 0 }]));
  const pages = new Map<string, number>();
  const modules = new Map<string, { path: string; name: string; impressions: number; clicks: number }>();

  rows.forEach((row) => {
    const uv = Number(row.uv) || 0;
    const day = daily.get(row.event_date);
    if (row.event_type === "page_view") {
      if (day) day.pageViews += uv;
      pages.set(row.page_path, (pages.get(row.page_path) ?? 0) + uv);
      return;
    }

    if (!row.module_name) return;
    const moduleKey = `${row.page_path}:${row.module_name}`;
    const moduleMetrics = modules.get(moduleKey) ?? {
      path: row.page_path,
      name: row.module_name,
      impressions: 0,
      clicks: 0,
    };
    if (row.event_type === "module_impression") {
      if (day) day.moduleImpressions += uv;
      moduleMetrics.impressions += uv;
    } else {
      if (day) day.moduleClicks += uv;
      moduleMetrics.clicks += uv;
    }
    modules.set(moduleKey, moduleMetrics);
  });

  const trend = dates.map((date) => ({ date, ...(daily.get(date) ?? { pageViews: 0, moduleImpressions: 0, moduleClicks: 0 }) }));
  const summary = trend.reduce(
    (total, day) => ({
      pageViews: total.pageViews + day.pageViews,
      moduleImpressions: total.moduleImpressions + day.moduleImpressions,
      moduleClicks: total.moduleClicks + day.moduleClicks,
      clickThroughRate: 0,
    }),
    { pageViews: 0, moduleImpressions: 0, moduleClicks: 0, clickThroughRate: 0 }
  );

  return {
    summary: { ...summary, clickThroughRate: roundedRate(summary.moduleClicks, summary.moduleImpressions) },
    trend,
    pages: [...pages.entries()]
      .map(([path, pageViews]) => ({ path, pageViews }))
      .sort((a, b) => b.pageViews - a.pageViews),
    modules: [...modules.values()]
      .map((module) => ({ ...module, clickThroughRate: roundedRate(module.clicks, module.impressions) }))
      .sort((a, b) => b.impressions - a.impressions),
  };
}
