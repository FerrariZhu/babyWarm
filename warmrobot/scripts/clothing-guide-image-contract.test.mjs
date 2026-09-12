import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coreGuidePath = new URL("../packages/core/src/category-guides.ts", import.meta.url);
const pageDataPath = new URL("../web/src/lib/daily-brief/get-home-daily-brief.ts", import.meta.url);
const profileDataPath = new URL("../web/src/lib/profile.ts", import.meta.url);
const dressingRecordListPath = new URL("../web/src/lib/dressing-records/list.ts", import.meta.url);
const sheetPath = new URL("../web/src/components/stitch/category-style-sheet.tsx", import.meta.url);
const guideAssetRoutePath = new URL("../web/src/app/api/guide-assets/[...path]/route.ts", import.meta.url);
const adminActionsPath = new URL("../admin/src/app/admin/variants/category-guide-actions.ts", import.meta.url);
const adminPanelPath = new URL("../admin/src/components/category-guide-admin-panel.tsx", import.meta.url);
const overviewMigrationPath = new URL(
  "../supabase/migrations/20260911131424_category_guide_overview_images.sql",
  import.meta.url
);
const selfHostedOverviewMigrationPath = new URL(
  "../postgres/migrations/20260911131500_category_guide_overview_images.sql",
  import.meta.url
);
const selfHostedPlanPath = new URL("./self-hosted-migration-plan.mjs", import.meta.url);
const composePath = new URL("../compose.yaml", import.meta.url);

test("clothing-guide entries preserve an optional visual asset", async () => {
  const source = await readFile(coreGuidePath, "utf8");

  assert.match(source, /imageUrl\?: string/);
  assert.match(source, /imageAlt\?: string/);
});

test("clothing-guide content preserves a category-level overview image", async () => {
  const source = await readFile(coreGuidePath, "utf8");

  assert.match(source, /export type CategoryGuideContent = \{[\s\S]*imageUrl\?: string/);
  assert.match(source, /guideKind: "category" \| "style" \| "material"/);
  assert.match(source, /guideKind === "category"/);
});

test("home guide payload attaches only approved visual assets", async () => {
  const source = await readFile(pageDataPath, "utf8");

  assert.match(source, /guide_visual_assets/);
  assert.match(source, /status = 'approved'/);
  assert.match(source, /ORDER BY created_at ASC/);
  assert.match(source, /attachGuideVisualAssets/);
});

test("profile page data serializes PostgreSQL date values before rendering", async () => {
  const source = await readFile(profileDataPath, "utf8");

  assert.match(source, /instanceof Date/);
  assert.match(source, /toISOString\(\)\.slice\(0, 10\)/);
  assert.match(source, /birth_date:/);
});

test("dressing records serialize PostgreSQL dates before client formatting", async () => {
  const source = await readFile(dressingRecordListPath, "utf8");

  assert.match(source, /recorded_date: string \| Date/);
  assert.match(source, /saved_at: string \| Date/);
  assert.match(source, /toISOString\(\)\.slice\(0, 10\)/);
});

test("guide sheet renders a fixed-ratio image with a text-only fallback", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.doesNotMatch(source, /next\/image/);
  assert.match(source, /<img/);
  assert.match(source, /entry\.imageUrl/);
  assert.match(source, /aspect-\[4\/3\]/);
  assert.match(source, /onError/);
});

test("guide sheet renders the category image once above the tabbed entries", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.match(source, /function CategoryGuideImage/);
  assert.match(source, /guide\?\.imageUrl/);
  assert.match(source, /aria-label="品类示意图"/);
});

test("guide card separates each recommendation point into a spaced paragraph", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.match(source, /guide-card-points/);
  assert.match(source, /flex flex-col gap-2\.5/);
  assert.match(source, /keyPoints\.map\(\(point, index\) =>/);
  assert.doesNotMatch(source, /keyPoints\[0\]/);
  assert.doesNotMatch(source, /keyPoints\[1\]/);
});

test("home guide payload uses its own server asset route instead of Supabase Storage", async () => {
  const source = await readFile(pageDataPath, "utf8");

  assert.match(source, /\/api\/guide-assets\//);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(source, /storage\/v1\/object\/public/);
});

test("server asset route exposes only approved guide images", async () => {
  const source = await readFile(guideAssetRoutePath, "utf8");

  assert.match(source, /guide_visual_assets/);
  assert.match(source, /status = 'approved'/);
  assert.match(source, /readFile/);
  assert.match(source, /GUIDE_ASSET_SEED_DIR/);
  assert.match(source, /guide-image-seeds/);
});

test("production containers share persistent guide asset storage", async () => {
  const source = await readFile(composePath, "utf8");

  assert.match(source, /guide_assets:/);
  assert.match(source, /\/var\/lib\/warmrobot\/guide-assets/);
});

test("admin guide save preserves visual fields instead of dropping them", async () => {
  const source = await readFile(adminActionsPath, "utf8");

  assert.match(source, /storage_path/);
  assert.match(source, /alt_text/);
  assert.match(source, /uploadGuideVisualAsset/);
  assert.match(source, /writeFile/);
  assert.doesNotMatch(source, /supabase\.storage/);
  assert.match(source, /instanceof Date/);
  assert.match(source, /toISOString/);
});

test("admin supports an approved category overview image", async () => {
  const [actionsSource, panelSource] = await Promise.all([
    readFile(adminActionsPath, "utf8"),
    readFile(adminPanelPath, "utf8"),
  ]);

  assert.match(actionsSource, /CATEGORY_GUIDE_VISUAL_AXIS/);
  assert.match(actionsSource, /CATEGORY_GUIDE_VISUAL_VALUE/);
  assert.match(actionsSource, /isKnownGuideVisualTarget/);
  assert.match(panelSource, /品类代表图/);
  assert.match(panelSource, /CATEGORY_GUIDE_VISUAL_AXIS/);
});

test("approved category image migration seeds all category assets", async () => {
  const source = await readFile(overviewMigrationPath, "utf8");
  const categoryRows = source.match(/[a-z][a-z0-9_]*\/category\/overview\/[0-9a-f-]{36}\.png/g) ?? [];

  assert.equal(categoryRows.length, 25);
  assert.match(source, /on conflict \(storage_path\) do update/i);
  assert.match(source, /status = excluded\.status/i);
});

test("self-hosted deployment seeds and exports category image records", async () => {
  const [migrationSource, planSource] = await Promise.all([
    readFile(selfHostedOverviewMigrationPath, "utf8"),
    readFile(selfHostedPlanPath, "utf8"),
  ]);
  const seedRows = migrationSource.match(/\('[a-z][a-z0-9_]*',\s*'[^']+',\s*\d+\)/g) ?? [];

  assert.equal(seedRows.length, 25);
  assert.match(migrationSource, /insert into public\.guide_visual_assets/i);
  assert.match(planSource, /"public\.guide_visual_assets"/);
});
