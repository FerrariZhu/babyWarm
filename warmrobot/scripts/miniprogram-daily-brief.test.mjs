import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { listBabyProfiles } from "../web/src/lib/babies/list-babies.ts";
import { getMiniProgramDailyBrief, MiniProgramBriefError } from "../web/src/lib/miniprogram/daily-brief.ts";

const BABY_A = "11111111-1111-4111-8111-111111111111";
const BABY_B = "22222222-2222-4222-8222-222222222222";
const baby = {
  id: BABY_A, name: "小暖", birth_date: "2024-01-01", gender: "female",
  activity_level: "low", current_size_label: "90", is_active: true,
  height_cm: 85, weight_kg: 12, wears_diaper: false,
  warmth_preference: "slightly_cold", warmth_offset: 4,
};
const weather = {
  temp: 20, feelsLike: 19, humidity: 55, windSpeed: 2, text: "晴",
  location: { name: "上海", latitude: 31.2, longitude: 121.5 },
};
const advice = {
  babyAgeMonths: 24, current: { outfitItems: [{ id: "top", label: "长袖上衣" }], extras: [], tags: [], requiredWarmth: 45 },
};
const now = new Date("2026-10-28T18:00:00.000Z");

function setup(overrides = {}) {
  const calls = [];
  const dependencies = {
    listBabies: async (userId) => { calls.push(["babies", userId]); return [baby]; },
    loadProfile: async (userId) => { calls.push(["profile", userId]); return { city: "上海", latitude: 31.2, longitude: 121.5 }; },
    getWeather: async (profile) => { calls.push(["weather", profile]); return weather; },
    loadVariants: async () => { calls.push(["variants"]); return []; },
    buildAdvice: (input) => { calls.push(["advice", input]); return advice; },
    conclusion: ({ baby: selected }) => `${selected.name}今天穿长袖上衣。`,
    ...overrides,
  };
  return { dependencies, calls };
}

test("native baby list is ownership-scoped, deterministic and returns numeric measurements", async () => {
  let captured;
  const rows = await listBabyProfiles(async (statement, values) => {
    captured = { statement, values };
    return [baby];
  }, "user-1");
  assert.deepEqual(rows, [baby]);
  assert.deepEqual(captured.values, ["user-1"]);
  assert.match(captured.statement, /WHERE b\.user_id = \$1/);
  assert.match(captured.statement, /ORDER BY b\.is_active DESC, b\.created_at ASC, b\.id ASC/);
  assert.match(captured.statement, /b\.height_cm::float8/);
  assert.doesNotMatch(captured.statement, /SELECT \*/);
});

test("no profile gives an explicit empty state without weather requests or default baby advice", async () => {
  const { dependencies, calls } = setup({ listBabies: async () => [] });
  const result = await getMiniProgramDailyBrief("user-1", null, dependencies, now);
  assert.equal(result.status, "needs_baby");
  assert.equal(result.baby, null);
  assert.equal(result.advice, null);
  assert.deepEqual(calls, []);
});

test("requested baby must belong to the authenticated parent's own list", async () => {
  const { dependencies, calls } = setup();
  await assert.rejects(getMiniProgramDailyBrief("user-1", BABY_B, dependencies, now),
    (error) => error instanceof MiniProgramBriefError && error.status === 404);
  assert.deepEqual(calls, [["babies", "user-1"]]);
});

test("malformed and empty baby IDs are rejected before any query", async () => {
  const { dependencies, calls } = setup();
  for (const id of ["", "not-a-uuid", "' OR true --"]) {
    await assert.rejects(getMiniProgramDailyBrief("user-1", id, dependencies, now),
      (error) => error.status === 400);
  }
  assert.deepEqual(calls, []);
});

test("no saved location does not silently recommend a Beijing outfit", async () => {
  const { dependencies, calls } = setup({ loadProfile: async () => ({ city: null, latitude: null, longitude: null }) });
  const result = await getMiniProgramDailyBrief("user-1", null, dependencies, now);
  assert.equal(result.status, "needs_location");
  assert.equal(result.baby.id, BABY_A);
  assert.equal(result.weather, null);
  assert.equal(calls.some(([type]) => type === "weather"), false);
});

test("weather failure is an explicit retriable state with profiles still available", async () => {
  const { dependencies, calls } = setup({ getWeather: async () => null });
  const result = await getMiniProgramDailyBrief("user-1", null, dependencies, now);
  assert.equal(result.status, "weather_unavailable");
  assert.equal(result.babies.length, 1);
  assert.equal(result.advice, null);
  assert.equal(calls.some(([type]) => type === "variants"), false);
});

test("selected baby's measurements, preference and diaper status reach the shared engine", async () => {
  const selected = { ...baby, id: BABY_B, name: "小宝", warmth_offset: -8, wears_diaper: true };
  const { dependencies, calls } = setup({ listBabies: async () => [baby, selected] });
  const result = await getMiniProgramDailyBrief("user-1", BABY_B, dependencies, now);
  assert.equal(result.status, "ready");
  assert.equal(result.baby.id, BABY_B);
  assert.equal(result.weather, weather);
  assert.equal(result.advice, advice);
  assert.equal(result.recommendedDate, "2026-10-29");
  assert.equal(result.generatedAt, now.toISOString());
  assert.match(result.conclusion, /小宝/);
  assert.deepEqual(calls.find(([type]) => type === "advice")[1].baby, {
    birthDate: selected.birth_date, activityLevel: "low", warmthOffset: -8,
    heightCm: 85, weightKg: 12, wearsDiaper: true,
  });
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("zero coordinates are valid and no-profile response is not substituted", async () => {
  const { dependencies, calls } = setup({ loadProfile: async () => ({ city: null, latitude: 0, longitude: 0 }) });
  const result = await getMiniProgramDailyBrief("user-1", null, dependencies, now);
  assert.equal(result.status, "ready");
  assert.deepEqual(calls.find(([type]) => type === "weather")[1], { city: null, latitude: 0, longitude: 0 });
});

function loadRoute(getCurrentUser, assemble) {
  const source = readFileSync(new URL("../web/src/app/api/miniprogram/daily-brief/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, URL,
    console: { error: () => {} },
    require: (name) => {
      if (name === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
      if (name.endsWith("/auth")) return { getCurrentUser };
      if (name.endsWith("/miniprogram/daily-brief")) return { getMiniProgramDailyBrief: assemble, MiniProgramBriefError };
      return {};
    },
  });
  return exports.GET;
}

test("native advice route denies unauthenticated requests before loading profiles", async () => {
  let called = false;
  const GET = loadRoute(async () => null, async () => { called = true; });
  const response = await GET(new Request("http://localhost/api/miniprogram/daily-brief"));
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("native advice route passes only the authenticated user and selected baby, and is non-cacheable", async () => {
  let captured;
  const GET = loadRoute(async () => ({ id: "verified-user" }), async (userId, babyId) => {
    captured = [userId, babyId];
    return { status: "needs_baby", babies: [] };
  });
  const response = await GET(new Request(`http://localhost/api/miniprogram/daily-brief?babyId=${BABY_A}&userId=attacker`));
  assert.equal(response.status, 200);
  assert.deepEqual(captured, ["verified-user", BABY_A]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("native advice route returns safe structured errors without exposing database details", async () => {
  const GET = loadRoute(async () => ({ id: "user-1" }), async () => { throw new Error("postgresql://secret@example"); });
  const response = await GET(new Request("http://localhost/api/miniprogram/daily-brief"));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|postgresql/);
});
