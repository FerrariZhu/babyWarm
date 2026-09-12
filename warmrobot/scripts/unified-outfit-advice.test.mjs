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
let buildCategoryAdvice;
let summarizeOutfit;
let parseSaveDressingRecordInput;
let timeSlotFromObservation;
let seasonFromDate;
let pickClosestVariant;

before(async () => {
  compiledCoreDir = await mkdtemp(join(tmpdir(), "warmrobot-unified-outfit-"));
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
      "packages/core/src/category-advice.ts",
      "packages/core/src/dressing-records.ts",
    ],
    { cwd: projectRoot }
  );

  ({ buildCategoryAdvice, pickClosestVariant, seasonFromDate, timeSlotFromObservation } = await import(join(compiledCoreDir, "category-advice.js")));
  ({ summarizeOutfit, parseSaveDressingRecordInput } = await import(join(compiledCoreDir, "dressing-records.js")));
});

after(async () => {
  if (compiledCoreDir) await rm(compiledCoreDir, { recursive: true, force: true });
});

const baby = {
  birthDate: "2023-01-01",
  activityLevel: "medium",
  warmthOffset: 0,
  heightCm: 96,
  weightKg: 15,
  wearsDiaper: true,
};

function weather(overrides) {
  return {
    temp: 25,
    feelsLike: 25,
    humidity: 55,
    windSpeed: 2,
    pressure: 1013,
    text: "晴",
    precipProbability: 0,
    uvIndex: 0,
    ...overrides,
  };
}

function categories(advice) {
  return advice.outfitItems.map((item) => item.category).filter(Boolean);
}

test("hot weather returns one complete outfit with shoes and no forced socks", () => {
  const advice = buildCategoryAdvice({
    weather: weather({ feelsLike: 34, temp: 35, uvIndex: 8 }),
    baby,
  });

  assert.deepEqual(categories(advice), [
    "tshirt_short",
    "pants_short",
    "shoes_sandal",
    "hat",
    "outer_uv",
  ]);
  assert.equal(advice.outfitItems.some((item) => item.id === "diaper"), false);
  assert.equal(
    advice.outfitItems.reduce((sum, item) => sum + (item.warmthValue ?? 0), 0),
    advice.requiredWarmth
  );
});

test("moderate UV stays a reminder and does not force sun-protection garments", () => {
  const advice = buildCategoryAdvice({
    weather: weather({ feelsLike: 30, temp: 31, uvIndex: 4 }),
    baby,
  });

  assert.equal(categories(advice).includes("hat"), false);
  assert.equal(categories(advice).includes("outer_uv"), false);
  assert.equal(advice.tags.some((tag) => tag.code === "uv_caution"), true);
});

test("extreme cold overrides the calendar season and includes complete lower-body layers", () => {
  const advice = buildCategoryAdvice({
    weather: weather({ feelsLike: -2, temp: 1, windSpeed: 8, uvIndex: 0 }),
    baby,
    recommendedDate: "2026-07-15",
  });
  const picked = categories(advice);

  for (const required of [
    "thermal_top",
    "sweater",
    "outer_down",
    "long_johns",
    "pants_long",
    "socks",
    "shoes_boot",
    "hat",
    "scarf",
    "gloves",
  ]) {
    assert.equal(picked.includes(required), true, `missing ${required}`);
  }
});

test("umbrella is kept separately and never receives a warmth allocation", () => {
  const advice = buildCategoryAdvice({
    weather: weather({ feelsLike: 18, temp: 19, precipProbability: 80 }),
    baby,
  });

  assert.equal(advice.extras[0]?.item?.id, "umbrella");
  assert.equal(advice.extras[0]?.item?.warmthValue, undefined);
  assert.equal(
    advice.outfitItems.reduce((sum, item) => sum + (item.warmthValue ?? 0), 0),
    advice.requiredWarmth
  );
});

test("saved outfit summaries use one outfit label and remain compatible with legacy records", () => {
  assert.deepEqual(
    summarizeOutfit({
      outfitItems: [{ kind: "category", id: "top", label: "短袖 T 恤" }],
      extras: [],
    }),
    { outfit: "短袖 T 恤", extras: "" }
  );

  assert.deepEqual(
    summarizeOutfit({
      indoorItems: [{ kind: "category", id: "top", label: "秋衣" }],
      outdoorAdditions: [{ kind: "category", id: "coat", label: "羽绒服" }],
      extras: [],
    }),
    { outfit: "秋衣、羽绒服", extras: "" }
  );
});

test("save payload accepts the unified outfit contract", () => {
  const parsed = parseSaveDressingRecordInput({
    babyId: "baby-1",
    babyName: "暖暖",
    advice: {
      outfitItems: [{ kind: "category", id: "top", label: "短袖 T 恤" }],
      extras: [],
      requiredWarmth: 18,
      reason: "轻薄穿着即可。",
    },
  });

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data.advice.outfitItems.map((item) => item.label), ["短袖 T 恤"]);
});

test("real-time observation chooses the matching time period instead of always using morning", () => {
  assert.equal(timeSlotFromObservation("2026-09-11T08:30:00+08:00"), "morning");
  assert.equal(timeSlotFromObservation("2026-09-11T14:30:00+08:00"), "afternoon");
  assert.equal(timeSlotFromObservation("2026-09-11T19:30:00+08:00"), "evening");
  assert.equal(timeSlotFromObservation("2026-09-11T23:30:00+08:00"), "night");
});

test("season is a soft material constraint until real-time cold becomes decisive", () => {
  const variants = [
    { id: "fleece", category_code: "fleece_top", warmth_value: 64, consumer_label: "抓绒上衣", sort_order: 1, is_active: true, material: "fleece" },
    { id: "light-knit", category_code: "sweater", warmth_value: 55, consumer_label: "轻薄针织衫", sort_order: 2, is_active: true, material: "acrylic" },
  ];

  assert.equal(seasonFromDate("2026-07-15"), "summer");
  assert.equal(
    pickClosestVariant(variants, ["fleece_top", "sweater"], 64, { season: "summer" })?.id,
    "light-knit"
  );
  assert.equal(
    pickClosestVariant(variants, ["fleece_top", "sweater"], 80, { season: "summer" })?.id,
    "fleece"
  );
});
