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

  ({ formatAdviceConclusionBlocks } = await import(
    join(compiledCoreDir, "advice-copy.js")
  ));
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
