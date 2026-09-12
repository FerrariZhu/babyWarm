import { AnalyticsDashboardView } from "@/components/analytics-dashboard";
import { getAnalyticsDashboard } from "./actions";

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  const days = params.days === "14" || params.days === "30" ? Number(params.days) : 7;
  const result = await getAnalyticsDashboard(days);
  if (!result.ok) {
    return <div className="rounded-xl bg-error-container p-6"><h1 className="font-headline-md text-on-error-container">无法加载数据总览</h1><p className="font-body-md mt-2 text-on-error-container">{result.error}</p><p className="font-body-md mt-3 text-on-error-container/80">请确认云端 PostgreSQL 已应用分析事件表结构，并正确配置 DATABASE_URL。</p></div>;
  }
  return <AnalyticsDashboardView dashboard={result.data} days={days} />;
}
