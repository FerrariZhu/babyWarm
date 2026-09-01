/**
 * Dressing-record snapshot, identity, and save-payload validation.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DressingAdvice } from "./daily-brief-types";
import type { HomeDailyBriefWeather } from "./daily-brief-types";
import {
  buildDressingRecordFromAdvice,
  dressingRecordIdentityKey,
  formatRecordedDateLabel,
  localCalendarDate,
  parseSaveDressingRecordInput,
  summarizeOutfit,
} from "./dressing-records";

const weather: HomeDailyBriefWeather = {
  observedAt: "2026-08-27T10:00:00+08:00",
  locationLabel: "上海市嘉定区南翔镇",
  conditionText: "晴",
  temp: 31,
  feelsLike: 34,
  windSpeed: 3.2,
  humidity: 72,
  uvIndex: 8,
  precipProbability: 20,
};

const advice: DressingAdvice = {
  indoorItems: [
    { kind: "tip", id: "diaper", label: "尿布", labelEn: "Diaper" },
    {
      kind: "category",
      id: "cat:bodysuit_short",
      label: "短袖包屁衣",
      category: "bodysuit_short",
    },
  ],
  outdoorAdditions: [
    { kind: "category", id: "cat:hat", label: "遮阳帽", category: "hat" },
  ],
  extras: [
    {
      type: "umbrella",
      reason: "可能会下雨。",
      item: { kind: "tip", id: "umbrella", label: "雨伞", labelEn: "Umbrella" },
    },
  ],
  tags: [{ code: "uv_caution", label: "注意防晒", tone: "uv" }],
  reason: "现在气温 31°C，体感偏热，穿衣指数 20。建议穿薄短袖包屁衣。",
  requiredWarmth: 20,
};

describe("buildDressingRecordFromAdvice", () => {
  it("snapshots checklist, weather, and conclusion without mutating source", () => {
    const record = buildDressingRecordFromAdvice({
      babyId: "baby-1",
      babyName: "米米",
      recordedDate: "2026-08-27",
      savedAt: "2026-08-27T10:05:00.000Z",
      advice,
      weather,
    });

    assert.equal(record.babyId, "baby-1");
    assert.equal(record.babyName, "米米");
    assert.equal(record.recordedDate, "2026-08-27");
    assert.equal(record.requiredWarmth, 20);
    assert.equal(record.reason, advice.reason);
    assert.deepEqual(record.outfit.indoorItems, advice.indoorItems);
    assert.deepEqual(record.outfit.outdoorAdditions, advice.outdoorAdditions);
    assert.deepEqual(record.outfit.extras, advice.extras);
    assert.equal(record.locationLabel, "上海市嘉定区南翔镇");
    assert.equal(record.weather?.temp, 31);
    assert.equal("tags" in record.outfit, false);

    record.outfit.indoorItems.push({
      kind: "tip",
      id: "mutated",
      label: "不应写回源清单",
    });
    assert.equal(advice.indoorItems.length, 2);
  });

  it("uses babyId + recordedDate as the same-day identity", () => {
    const a = dressingRecordIdentityKey("baby-1", "2026-08-27");
    const b = dressingRecordIdentityKey("baby-1", "2026-08-27");
    const c = dressingRecordIdentityKey("baby-1", "2026-08-28");
    const d = dressingRecordIdentityKey("baby-2", "2026-08-27");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.notEqual(a, d);
  });
});

describe("summarizeOutfit", () => {
  it("joins zone labels with顿号 and uses extra item labels", () => {
    const summary = summarizeOutfit({
      indoorItems: advice.indoorItems,
      outdoorAdditions: advice.outdoorAdditions,
      extras: advice.extras,
    });
    assert.equal(summary.indoor, "尿布、短袖包屁衣");
    assert.equal(summary.outdoor, "遮阳帽");
    assert.equal(summary.extras, "雨伞");
  });

  it("returns empty strings when a zone has no items", () => {
    const summary = summarizeOutfit({
      indoorItems: [],
      outdoorAdditions: [],
      extras: [],
    });
    assert.equal(summary.indoor, "");
    assert.equal(summary.outdoor, "");
    assert.equal(summary.extras, "");
  });
});

describe("formatRecordedDateLabel", () => {
  const now = new Date("2026-08-27T12:00:00+08:00");

  it("labels today, yesterday, and other days", () => {
    assert.equal(formatRecordedDateLabel("2026-08-27", now), "今天");
    assert.equal(formatRecordedDateLabel("2026-08-26", now), "昨天");
    assert.equal(formatRecordedDateLabel("2026-08-20", now), "8月20日");
    assert.equal(formatRecordedDateLabel("2025-12-31", now), "2025年12月31日");
  });

  it("formats local calendar date in Asia/Shanghai", () => {
    assert.equal(
      localCalendarDate(new Date("2026-08-26T16:30:00Z"), "Asia/Shanghai"),
      "2026-08-27"
    );
  });
});

describe("parseSaveDressingRecordInput", () => {
  const validBody = {
    babyId: "baby-1",
    babyName: "米米",
    advice: {
      indoorItems: advice.indoorItems,
      outdoorAdditions: advice.outdoorAdditions,
      extras: advice.extras,
      reason: advice.reason,
      requiredWarmth: 20,
    },
    weather,
  };

  it("accepts a complete save payload", () => {
    const parsed = parseSaveDressingRecordInput(validBody);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.babyId, "baby-1");
    assert.equal(parsed.data.advice.requiredWarmth, 20);
    assert.equal(parsed.data.advice.indoorItems.length, 2);
  });

  it("rejects missing babyId", () => {
    const parsed = parseSaveDressingRecordInput({ ...validBody, babyId: "  " });
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /宝宝/);
  });

  it("rejects non-finite requiredWarmth", () => {
    const parsed = parseSaveDressingRecordInput({
      ...validBody,
      advice: { ...validBody.advice, requiredWarmth: "warm" },
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects a non-object body", () => {
    const parsed = parseSaveDressingRecordInput(null);
    assert.equal(parsed.ok, false);
  });
});
