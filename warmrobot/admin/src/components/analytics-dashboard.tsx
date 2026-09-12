import Link from "next/link";
import type { AnalyticsDashboard } from "@/lib/admin/analytics-dashboard";

const RANGE_OPTIONS = [7, 14, 30] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function TrendChart({ dashboard }: { dashboard: AnalyticsDashboard }) {
  const max = Math.max(1, ...dashboard.trend.flatMap((item) => [item.pageViews, item.moduleImpressions, item.moduleClicks]));
  const width = 720;
  const height = 220;
  const pad = 24;
  const x = (index: number) => pad + (index * (width - pad * 2)) / Math.max(dashboard.trend.length - 1, 1);
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const path = (metric: "pageViews" | "moduleImpressions" | "moduleClicks") =>
    dashboard.trend.map((item, index) => `${index === 0 ? "M" : "L"}${x(index)} ${y(item[metric])}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="每日访问趋势" className="min-w-[580px] w-full">
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={pad} x2={width - pad} y1={pad + (height - pad * 2) * ratio} y2={pad + (height - pad * 2) * ratio} stroke="#e1e3e4" strokeWidth="1" />)}
        <path d={path("pageViews")} fill="none" stroke="#106399" strokeWidth="3" strokeLinecap="round" />
        <path d={path("moduleImpressions")} fill="none" stroke="#3f6840" strokeWidth="3" strokeLinecap="round" />
        <path d={path("moduleClicks")} fill="none" stroke="#c38c2c" strokeWidth="3" strokeLinecap="round" />
        {dashboard.trend.map((item, index) => <text key={item.date} x={x(index)} y={height - 4} textAnchor="middle" fill="#636e72" fontSize="11">{formatDate(item.date)}</text>)}
      </svg>
    </div>
  );
}

export function AnalyticsDashboardView({ dashboard, days }: { dashboard: AnalyticsDashboard; days: number }) {
  const hasData = dashboard.summary.pageViews > 0 || dashboard.summary.moduleImpressions > 0;
  const metrics = [
    ["页面 UV", dashboard.summary.pageViews, "按页面汇总，访问同一页面的访客去重"],
    ["模块曝光 UV", dashboard.summary.moduleImpressions, "模块至少 50% 进入视区时计入"],
    ["模块点击 UV", dashboard.summary.moduleClicks, "同一模块的点击访客去重"],
    ["模块点击率", `${dashboard.summary.clickThroughRate}%`, "模块点击 UV / 模块曝光 UV"],
  ] as const;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-on-background">数据总览</h1>
          <p className="font-body-md mt-1 text-text-soft">观察 C 端页面与模块在不同日期的访问和交互变化。</p>
        </div>
        <nav aria-label="统计周期" className="flex rounded-lg bg-surface-container p-1">
          {RANGE_OPTIONS.map((option) => <Link key={option} href={`/admin?days=${option}`} className={`font-label-md rounded-md px-4 py-2 transition ${days === option ? "bg-surface-container-lowest text-primary shadow-sm" : "text-text-soft hover:text-on-surface"}`}>近 {option} 天</Link>)}
        </nav>
      </div>

      {!hasData ? <div className="rounded-xl bg-surface-container-low p-8 text-center"><h2 className="font-headline-md text-on-surface">还没有可展示的数据</h2><p className="font-body-md mt-2 text-text-soft">应用埋点 migration 后，用户访问 C 端即可在这里看到趋势。</p></div> : <>
        <section aria-label="核心指标" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, note]) => <article key={label} className="rounded-xl bg-surface-container-lowest p-5 shadow-sm"><p className="font-label-md text-text-soft">{label}</p><p className="font-headline-lg mt-3 tabular-nums text-on-surface">{typeof value === "number" ? formatNumber(value) : value}</p><p className="font-label-sm mt-2 text-text-soft">{note}</p></article>)}
        </section>
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline-md">每日趋势</h2><p className="font-body-md mt-1 text-text-soft">蓝色：页面 UV · 绿色：模块曝光 UV · 金色：模块点击 UV</p></div></div><div className="mt-6"><TrendChart dashboard={dashboard} /></div></section>
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"><div className="p-6"><h2 className="font-headline-md">页面访问排行</h2><p className="font-body-md mt-1 text-text-soft">按页面 UV 排序</p></div><table className="w-full text-left"><thead className="bg-surface-container-low text-text-soft"><tr><th className="px-6 py-3 font-label-sm">页面</th><th className="px-6 py-3 text-right font-label-sm">UV</th></tr></thead><tbody>{dashboard.pages.slice(0, 8).map((item) => <tr key={item.path} className="border-t border-outline-variant/30"><td className="px-6 py-3 font-body-md">{item.path}</td><td className="px-6 py-3 text-right font-label-md tabular-nums">{formatNumber(item.pageViews)}</td></tr>)}</tbody></table></section>
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"><div className="p-6"><h2 className="font-headline-md">模块表现</h2><p className="font-body-md mt-1 text-text-soft">按曝光 UV 排序</p></div><table className="w-full text-left"><thead className="bg-surface-container-low text-text-soft"><tr><th className="px-6 py-3 font-label-sm">模块</th><th className="px-6 py-3 text-right font-label-sm">曝光</th><th className="px-6 py-3 text-right font-label-sm">点击率</th></tr></thead><tbody>{dashboard.modules.slice(0, 8).map((item) => <tr key={`${item.path}-${item.name}`} className="border-t border-outline-variant/30"><td className="px-6 py-3"><p className="font-body-md">{item.name}</p><p className="font-label-sm text-text-soft">{item.path}</p></td><td className="px-6 py-3 text-right font-label-md tabular-nums">{formatNumber(item.impressions)}</td><td className="px-6 py-3 text-right font-label-md tabular-nums">{item.clickThroughRate}%</td></tr>)}</tbody></table></section>
        </div>
      </>}
    </div>
  );
}
