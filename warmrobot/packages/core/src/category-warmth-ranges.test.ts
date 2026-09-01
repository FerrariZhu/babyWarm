/**
 * Category warmth interval definitions.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATEGORY_WARMTH_RANGE_ENTRIES,
  CATEGORY_WARMTH_RANGES,
  isWarmthInCategoryRange,
  WARMTH_BAND_EDGES,
} from "./category-warmth-ranges";
import type { ClothingCategory } from "./types";

const ALL_CATEGORIES: ClothingCategory[] = [
  "bodysuit_short",
  "bodysuit_long",
  "tshirt_short",
  "tshirt_long",
  "thermal_top",
  "sweater",
  "fleece_top",
  "vest",
  "vest_down",
  "outer_uv",
  "outer_shell",
  "outer_cotton",
  "outer_down",
  "long_johns",
  "pants_short",
  "pants_mid",
  "pants_long",
  "shoes_sandal",
  "shoes_sneaker",
  "shoes_leather",
  "shoes_boot",
  "hat",
  "scarf",
  "gloves",
  "socks",
  "other",
];

describe("CATEGORY_WARMTH_RANGES", () => {
  it("covers all ClothingCategory codes", () => {
    assert.equal(CATEGORY_WARMTH_RANGE_ENTRIES.length, ALL_CATEGORIES.length);
    for (const code of ALL_CATEGORIES) {
      assert.ok(CATEGORY_WARMTH_RANGES[code], `missing range for ${code}`);
    }
  });

  it("every interval is valid 0–100 with min <= max", () => {
    for (const [code, range] of CATEGORY_WARMTH_RANGE_ENTRIES) {
      assert.ok(range.warmthMin >= 0, `${code} warmthMin`);
      assert.ok(range.warmthMax <= 100, `${code} warmthMax`);
      assert.ok(range.warmthMin <= range.warmthMax, `${code} order`);
    }
  });

  it("isWarmthInCategoryRange uses closed interval", () => {
    const { warmthMin, warmthMax } = CATEGORY_WARMTH_RANGES.pants_short;
    assert.equal(isWarmthInCategoryRange(warmthMin, "pants_short"), true);
    assert.equal(isWarmthInCategoryRange(warmthMax, "pants_short"), true);
    assert.equal(isWarmthInCategoryRange(warmthMin - 1, "pants_short"), false);
    assert.equal(isWarmthInCategoryRange(warmthMax + 1, "pants_short"), false);
  });

  it("band edges align with category-advice thresholds", () => {
    assert.deepEqual([...WARMTH_BAND_EDGES], [25, 40, 55, 70, 85]);
  });
});
