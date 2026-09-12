import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
let compiledCoreDir;
let formatAdviceConclusionBlocks;
let formatDressingMethod;
let formatOutfitAdviceRows;
let isBriefAdviceCurrent;

before(async () => {
  compiledCoreDir = await mkdtemp(join(tmpdir(), "warmrobot-advice-copy-"));
  await execFileAsync(
    join(projectRoot, "node_modules/.bin/tsc"),
    [
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--strict",
      "--skipLibCheck",
      "--esModuleInterop",
      "--outDir",
      compiledCoreDir,
      "packages/core/src/advice-copy.ts",
    ],
    { cwd: projectRoot }
  );

  ({
    formatAdviceConclusionBlocks,
    formatDressingMethod,
    formatOutfitAdviceRows,
  } = await import(join(compiledCoreDir, "advice-copy.js")));
  ({ isBriefAdviceCurrent } = await import(
    join(compiledCoreDir, "daily-brief-types.js")
  ));
});

after(async () => {
  if (compiledCoreDir) await rm(compiledCoreDir, { recursive: true, force: true });
});

const coldWeather = {
  temp: 2,
  feelsLike: -1,
  text: "多云",
  humidity: 80,
  windSpeed: 1,
  uvIndex: 0,
};

const categoryItem = (id, label, category, outfitSlot) => ({
  kind: "category",
  id,
  label,
  category,
  outfitSlot,
});

function wearLines(outfitItems) {
  const blocks = formatAdviceConclusionBlocks({
    weather: coldWeather,
    requiredWarmth: 80,
    ageMonths: 4,
    wearsDiaper: true,
    outfitItems: [
      ...outfitItems,
      categoryItem("mid", "纯棉毛衣", "sweater", "mid_top"),
      categoryItem("outer", "羽绒服", "outer_down", "outer"),
    ],
  });

  return blocks.find((block) => block.kind === "wear").lines;
}

test("cold-weather copy names the base-bottom garment when no outer pants are listed", () => {
  const lines = wearLines([
    categoryItem("top", "纯棉长袖包屁衣", "bodysuit_long", "base_top"),
    categoryItem("base-bottom", "秋裤", "long_johns", "base_bottom"),
    categoryItem("socks", "纯棉袜子", "socks", "socks"),
  ]);

  assert.ok(lines.includes("下身穿贴身纯棉秋裤就行。"));
  assert.ok(!lines.some((line) => line.includes("按清单搭配")));
});

test("cold-weather copy gives a concrete lower-body fallback when the checklist has no bottoms", () => {
  const lines = wearLines([
    categoryItem("top", "纯棉长袖包屁衣", "bodysuit_long", "base_top"),
    categoryItem("socks", "纯棉袜子", "socks", "socks"),
  ]);

  assert.ok(lines.includes("下身需要补穿一条保暖长裤。"));
  assert.ok(!lines.some((line) => line.includes("按清单搭配")));
});

test("cached briefs from before the lower-body copy fix are regenerated", () => {
  assert.equal(
    isBriefAdviceCurrent({
      schemaVersion: 27,
      current: { tags: [] },
    }),
    false
  );
});

test("freezing weather uses the reinforced onion strategy", () => {
  assert.deepEqual(formatDressingMethod(100), {
    title: "加强型洋葱穿衣法",
    steps: ["内层保暖", "中层锁温", "外层挡风雪"],
    note: "进屋后再逐层脱下",
  });
});

test("outfit rows translate exact garment attributes into conversational copy", () => {
  const rows = formatOutfitAdviceRows(100, [
    {
      ...categoryItem("top", "秋衣", "thermal_top", "base_top"),
      material: "cotton",
      thickness: "thick",
      fitType: "regular",
    },
    {
      ...categoryItem("mid", "毛衣", "sweater", "mid_top"),
      material: "cotton",
      thickness: "thick",
      fitType: "loose",
    },
    {
      ...categoryItem("outer", "羽绒服", "outer_down", "outer"),
      material: "down",
      thickness: "extreme_cold",
      fitType: "loose",
    },
    {
      ...categoryItem("base-bottom", "秋裤", "long_johns", "base_bottom"),
      material: "cotton",
      thickness: "thick",
      fitType: "regular",
    },
    {
      ...categoryItem("bottom", "长裤", "pants_long", "bottom"),
      material: "cotton",
      thickness: "thick",
      fitType: "loose",
      pantLength: "full_length",
    },
    {
      ...categoryItem("socks", "袜子", "socks", "socks"),
      material: "cotton",
      thickness: "thick",
      sockHeight: "mid_calf",
    },
    {
      ...categoryItem("boots", "高帮靴", "shoes_boot", "shoes"),
      thickness: "fleece_lined",
    },
    {
      ...categoryItem("hat", "保暖帽", "hat", "hat"),
      hatKind: "warm",
    },
    {
      ...categoryItem("scarf", "围巾", "scarf", "scarf"),
      material: "cotton",
      thickness: "thick",
    },
    {
      ...categoryItem("gloves", "手套", "gloves", "gloves"),
      material: "cotton",
      thickness: "thick",
    },
  ]);

  assert.deepEqual(rows, [
    {
      zone: "上身",
      text: "最里面穿加厚纯棉秋衣，外面套一件宽松的厚款纯棉毛衣，最外层再穿蓬松保暖的羽绒服。",
      emphasisTerms: ["秋衣", "毛衣", "羽绒服"],
    },
    {
      zone: "下身",
      text: "里面穿一条加厚纯棉秋裤，外面再加宽松的厚款纯棉长裤。",
      emphasisTerms: ["秋裤", "长裤"],
    },
    {
      zone: "脚上",
      text: "穿一双保暖的纯棉中筒袜，搭配加绒高帮靴。",
      emphasisTerms: ["中筒袜", "高帮靴"],
    },
    {
      zone: "配件",
      text: "戴好保暖帽，围上厚棉围巾，再戴纯棉保暖手套。",
      emphasisTerms: ["保暖帽", "围巾", "手套"],
    },
  ]);
  assert.ok(rows.every((row) => !row.text.includes("标准版")));
  assert.ok(rows.every((row) => !row.text.includes("厚实的")));
  assert.ok(rows.every((row) => !row.text.includes("→")));
});

test("zone labels do not repeat inside a single-layer sentence", () => {
  const rows = formatOutfitAdviceRows(8, [
    {
      ...categoryItem("top", "包屁衣", "bodysuit_short", "base_top"),
      material: "cotton",
      thickness: "thin",
    },
  ]);

  assert.deepEqual(rows, [
    {
      zone: "上身",
      text: "穿一件轻薄纯棉包屁衣。",
      emphasisTerms: ["包屁衣"],
    },
  ]);
});
