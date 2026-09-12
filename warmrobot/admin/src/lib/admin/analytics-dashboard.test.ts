import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner executes this TypeScript source directly.
import { buildAnalyticsDashboard } from "./analytics-dashboard.ts";

test("aggregates daily, page, and module UV metrics", () => {
  const dashboard = buildAnalyticsDashboard(
    [
      { event_date: "2026-09-07", event_type: "page_view", page_path: "/", module_name: null, action_name: null, uv: 12 },
      { event_date: "2026-09-07", event_type: "module_impression", page_path: "/", module_name: "weather", action_name: "view", uv: 10 },
      { event_date: "2026-09-07", event_type: "module_click", page_path: "/", module_name: "weather", action_name: "interact", uv: 4 },
      { event_date: "2026-09-08", event_type: "page_view", page_path: "/profile", module_name: null, action_name: null, uv: 8 },
      { event_date: "2026-09-08", event_type: "module_impression", page_path: "/profile", module_name: "baby_profile", action_name: "view", uv: 7 },
      { event_date: "2026-09-08", event_type: "module_click", page_path: "/profile", module_name: "baby_profile", action_name: "edit_profile", uv: 2 },
    ],
    ["2026-09-07", "2026-09-08"]
  );

  assert.deepEqual(dashboard.summary, {
    pageViews: 20,
    moduleImpressions: 17,
    moduleClicks: 6,
    clickThroughRate: 35.3,
  });
  assert.equal(dashboard.pages[0]?.path, "/");
  assert.equal(dashboard.modules[0]?.name, "weather");
  assert.deepEqual(dashboard.trend.map((item) => item.pageViews), [12, 8]);
});
