/**
 * Exhaustive tip-tag enum + weather threshold evaluation.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADVICE_TIP_TAG_CODES,
  ADVICE_TIP_TAG_DEFS,
  evaluateTipTag,
  resolveAdviceTipTags,
  tipTagMeta,
  WIND_TIP_THRESHOLD_MS,
  type AdviceTipTagCode,
} from "./advice-tip-tags";
import {
  UV_OUTDOOR_THRESHOLD,
  PRECIP_PROBABILITY_THRESHOLD,
} from "./warmth-thresholds";
import type { WeatherSnapshot } from "./types";

function weather(partial: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    temp: 25,
    feelsLike: 25,
    humidity: 50,
    windSpeed: 3,
    pressure: 1013,
    text: "晴",
    uvIndex: 0,
    precipProbability: 0,
    ...partial,
  };
}

describe("advice tip tag enum", () => {
  it("has exactly 3 codes (no indoor_ok)", () => {
    assert.equal(ADVICE_TIP_TAG_CODES.length, 3);
    assert.ok(!ADVICE_TIP_TAG_CODES.includes("indoor_ok" as AdviceTipTagCode));
  });

  it("defs cover every code (exhaustive)", () => {
    for (const code of ADVICE_TIP_TAG_CODES) {
      const def = tipTagMeta(code);
      assert.equal(def.code, code);
      assert.equal(ADVICE_TIP_TAG_DEFS[code].code, code);
    }
  });

  it("thresholds match product defaults", () => {
    assert.equal(ADVICE_TIP_TAG_DEFS.uv_caution.threshold, UV_OUTDOOR_THRESHOLD);
    assert.equal(
      ADVICE_TIP_TAG_DEFS.bring_umbrella.threshold,
      PRECIP_PROBABILITY_THRESHOLD
    );
    assert.equal(ADVICE_TIP_TAG_DEFS.wind_caution.threshold, WIND_TIP_THRESHOLD_MS);
    assert.equal(WIND_TIP_THRESHOLD_MS, 5);
  });
});

describe("evaluateTipTag", () => {
  it("uv_caution at UV threshold", () => {
    assert.equal(
      evaluateTipTag("uv_caution", weather({ uvIndex: UV_OUTDOOR_THRESHOLD - 1 })),
      false
    );
    assert.equal(
      evaluateTipTag("uv_caution", weather({ uvIndex: UV_OUTDOOR_THRESHOLD })),
      true
    );
  });

  it("bring_umbrella on precip threshold or raining text", () => {
    assert.equal(
      evaluateTipTag(
        "bring_umbrella",
        weather({ precipProbability: PRECIP_PROBABILITY_THRESHOLD - 1 })
      ),
      false
    );
    assert.equal(
      evaluateTipTag(
        "bring_umbrella",
        weather({ precipProbability: PRECIP_PROBABILITY_THRESHOLD })
      ),
      true
    );
    assert.equal(
      evaluateTipTag("bring_umbrella", weather({ text: "小雨", precipProbability: 0 })),
      true
    );
  });

  it("wind_caution at wind speed threshold", () => {
    assert.equal(
      evaluateTipTag(
        "wind_caution",
        weather({ windSpeed: WIND_TIP_THRESHOLD_MS - 0.1 })
      ),
      false
    );
    assert.equal(
      evaluateTipTag("wind_caution", weather({ windSpeed: WIND_TIP_THRESHOLD_MS })),
      true
    );
  });
});

describe("resolveAdviceTipTags", () => {
  it("calm clear day → no tags", () => {
    const tags = resolveAdviceTipTags(weather());
    assert.deepEqual(tags.map((t) => t.code), []);
  });

  it("UV + rain + wind → all three tags", () => {
    const tags = resolveAdviceTipTags(
      weather({
        uvIndex: 8,
        text: "雨",
        precipProbability: 80,
        windSpeed: 7,
      })
    );
    assert.deepEqual(
      tags.map((t) => t.code),
      ["uv_caution", "bring_umbrella", "wind_caution"] satisfies AdviceTipTagCode[]
    );
  });
});
