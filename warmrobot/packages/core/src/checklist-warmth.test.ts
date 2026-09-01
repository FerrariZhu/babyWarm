import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdviceItem } from "./daily-brief-types";
import {
  allocateSlotWarmthIndices,
  DIAPER_OUTFIT_SLOT,
  DIAPER_WARMTH_VALUE,
  effectiveChecklistWarmth,
  INDOOR_ZONE_WARMTH_FACTOR,
  OUTDOOR_ZONE_WARMTH_FACTOR,
  slotTargetWarmth,
  zoneTargetWarmth,
} from "./checklist-warmth";

describe("zoneTargetWarmth", () => {
  it("indoor is lower and outdoor is higher than R", () => {
    assert.equal(zoneTargetWarmth(40, "indoor"), Math.round(40 * INDOOR_ZONE_WARMTH_FACTOR));
    assert.equal(zoneTargetWarmth(40, "outdoor"), Math.round(40 * OUTDOOR_ZONE_WARMTH_FACTOR));
    assert.ok(zoneTargetWarmth(40, "indoor") < 40);
    assert.ok(zoneTargetWarmth(40, "outdoor") > 40);
  });
});

describe("slotTargetWarmth", () => {
  it("uses zone-adjusted R × slot alpha", () => {
    assert.equal(slotTargetWarmth(20, "base_top", "indoor"), 16);
    assert.equal(slotTargetWarmth(20, "outer", "outdoor"), 25);
    assert.equal(slotTargetWarmth(20, DIAPER_OUTFIT_SLOT, "indoor"), DIAPER_WARMTH_VALUE);
  });
});

describe("allocateSlotWarmthIndices", () => {
  it("splits zone target across slots and sums exactly", () => {
    const slots = [DIAPER_OUTFIT_SLOT, "base_top", "bottom", "socks"];
    const zoneR = zoneTargetWarmth(40, "indoor");
    const allocations = allocateSlotWarmthIndices(slots, zoneR, {
      [DIAPER_OUTFIT_SLOT]: DIAPER_WARMTH_VALUE,
    });
    const sum = slots.reduce((total, slot) => total + (allocations[slot] ?? 0), 0);
    assert.equal(sum, zoneR);
    assert.equal(allocations[DIAPER_OUTFIT_SLOT], DIAPER_WARMTH_VALUE);
  });
});

describe("effectiveChecklistWarmth", () => {
  it("sums slot indices on cards", () => {
    const items: AdviceItem[] = [
      {
        kind: "tip",
        id: "diaper",
        label: "尿布",
        warmthValue: 12,
        outfitSlot: DIAPER_OUTFIT_SLOT,
      },
      {
        kind: "category",
        id: "cat:tshirt_short",
        label: "T恤",
        outfitSlot: "base_top",
        warmthValue: 15,
      },
      {
        kind: "category",
        id: "cat:pants_short",
        label: "短裤",
        outfitSlot: "bottom",
        warmthValue: 10,
      },
      {
        kind: "category",
        id: "cat:socks",
        label: "薄袜子",
        outfitSlot: "socks",
        warmthValue: 3,
      },
    ];
    assert.equal(effectiveChecklistWarmth(items), 40);
  });

  it("ignores umbrella tip without warmth", () => {
    const items: AdviceItem[] = [
      {
        kind: "category",
        id: "cat:outer_uv",
        label: "防晒衣",
        outfitSlot: "outer",
        warmthValue: 20,
      },
      { kind: "tip", id: "umbrella", label: "雨伞" },
    ];
    assert.equal(effectiveChecklistWarmth(items), 20);
  });

  it("returns null when nothing has warmth", () => {
    assert.equal(
      effectiveChecklistWarmth([{ kind: "tip", id: "umbrella", label: "雨伞" }]),
      null
    );
  });

  it("uses default diaper warmth when warmthValue omitted", () => {
    const items: AdviceItem[] = [
      { kind: "tip", id: "diaper", label: "尿布", outfitSlot: DIAPER_OUTFIT_SLOT },
    ];
    assert.equal(effectiveChecklistWarmth(items), DIAPER_WARMTH_VALUE);
  });
});
