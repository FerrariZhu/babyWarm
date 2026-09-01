/**
 * Slot-swap ranking: same outfit slot, category or material alternatives.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySlotSwap,
  buildSwapReason,
  formatSlotSwapOptionLabel,
  rankSlotAlternatives,
  rotateSlotSwap,
  variantIdentity,
} from "./slot-swap";
import type { VariantSlimRow } from "./variant-types";

function row(
  partial: Partial<VariantSlimRow> &
    Pick<VariantSlimRow, "category_code" | "warmth_value" | "consumer_label">
): VariantSlimRow {
  return {
    sort_order: 0,
    is_active: true,
    ...partial,
  };
}

const cottonTee = row({
  category_code: "tshirt_short",
  warmth_value: 15,
  consumer_label: "T恤 · 纯棉日常",
  material: "cotton",
  thickness: "medium",
  fit_type: "regular",
  outfit_slot: "base_top",
  sort_order: 1,
});

const modalTee = row({
  category_code: "tshirt_short",
  warmth_value: 12,
  consumer_label: "T恤 · 轻薄透气",
  material: "modal",
  thickness: "thin",
  fit_type: "regular",
  outfit_slot: "base_top",
  sort_order: 2,
});

const polyLooseTee = row({
  category_code: "tshirt_short",
  warmth_value: 10,
  consumer_label: "T恤 · 轻薄速干 宽松",
  material: "polyester",
  thickness: "thin",
  fit_type: "loose",
  outfit_slot: "base_top",
  sort_order: 3,
});

const cottonLooseTee = row({
  category_code: "tshirt_short",
  warmth_value: 18,
  consumer_label: "T恤 · 纯棉日常 宽松",
  material: "cotton",
  thickness: "medium",
  fit_type: "loose",
  outfit_slot: "base_top",
  sort_order: 4,
});

const thickCotton = row({
  category_code: "tshirt_long",
  warmth_value: 70,
  consumer_label: "长袖T恤 · 厚棉保暖",
  material: "cotton",
  thickness: "thick",
  fit_type: "regular",
  outfit_slot: "base_top",
  sort_order: 5,
});

const shortPants = row({
  category_code: "pants_short",
  warmth_value: 25,
  consumer_label: "短裤 · 轻薄透气",
  material: "cotton",
  thickness: "thin",
  fit_type: "regular",
  outfit_slot: "bottom",
  sort_order: 1,
});

const midPants = row({
  category_code: "pants_mid",
  warmth_value: 40,
  consumer_label: "中裤 · 纯棉日常",
  material: "cotton",
  thickness: "medium",
  fit_type: "regular",
  outfit_slot: "bottom",
  sort_order: 2,
});

const longPants = row({
  category_code: "pants_long",
  warmth_value: 55,
  consumer_label: "长裤 · 纯棉日常",
  material: "cotton",
  thickness: "medium",
  fit_type: "regular",
  outfit_slot: "bottom",
  sort_order: 3,
});

describe("variantIdentity", () => {
  it("differs when material changes", () => {
    assert.notEqual(variantIdentity(cottonTee), variantIdentity(modalTee));
  });
});

describe("formatSlotSwapOptionLabel", () => {
  it("joins name, material, subtitle, and warmth index", () => {
    const label = formatSlotSwapOptionLabel({
      kind: "category",
      id: "cat:pants_short",
      label: "短裤",
      subtitle: "轻薄透气",
      material: "cotton",
      warmthValue: 25,
    });
    assert.ok(label.includes("短裤"));
    assert.ok(label.includes("纯棉"));
    assert.ok(label.includes("轻薄透气"));
    assert.ok(label.includes("指数 25"));
  });
});

describe("buildSwapReason", () => {
  it("cotton → modal: cooler and quicker dry", () => {
    const reason = buildSwapReason(cottonTee, modalTee);
    assert.ok(reason.includes("凉") || reason.includes("干"));
    assert.ok(reason.includes("莫代尔") || reason.includes("换成"));
  });

  it("shorts → mid pants mentions type change", () => {
    const reason = buildSwapReason(shortPants, midPants);
    assert.ok(reason.includes("裤型") || reason.includes("类型"));
  });

  it("regular → loose: easier to crawl and walk", () => {
    const reason = buildSwapReason(cottonTee, cottonLooseTee);
    assert.ok(reason.includes("宽松") || reason.includes("自在"));
  });
});

describe("rankSlotAlternatives", () => {
  const teePool = [cottonTee, modalTee, polyLooseTee, cottonLooseTee, thickCotton];
  const pantsPool = [shortPants, midPants, longPants];

  it("excludes the current variant", () => {
    const ranked = rankSlotAlternatives({
      current: cottonTee,
      candidates: teePool,
      requiredWarmth: 18,
      baby: { activityLevel: "high" },
    });
    assert.ok(ranked.every((r) => variantIdentity(r.variant) !== variantIdentity(cottonTee)));
  });

  it("multi-category slot returns one pick per other category only", () => {
    const ranked = rankSlotAlternatives({
      current: shortPants,
      candidates: pantsPool,
      requiredWarmth: 28,
      baby: { activityLevel: "medium" },
    });
    const codes = ranked.map((r) => r.variant.category_code);
    assert.deepEqual(codes.sort(), ["pants_long", "pants_mid"]);
    assert.ok(!codes.includes("pants_short"));
  });

  it("single-category slots have no type alternatives", () => {
    const ranked = rankSlotAlternatives({
      current: cottonTee,
      candidates: teePool,
      requiredWarmth: 15,
      baby: { activityLevel: "high" },
    });
    assert.equal(ranked.length, 0);
  });

  it("uses anchor warmth so cross-category pants stay in range", () => {
    const ranked = rankSlotAlternatives({
      current: shortPants,
      candidates: [shortPants, midPants, longPants],
      requiredWarmth: shortPants.warmth_value,
      baby: { activityLevel: "low" },
    });
    const codes = ranked.map((r) => r.variant.category_code);
    assert.ok(codes.includes("pants_mid"));
    assert.ok(codes.includes("pants_long"));
  });

  it("cross-category window reaches long pants from shorts at generator warmth", () => {
    const ranked = rankSlotAlternatives({
      current: shortPants,
      candidates: [shortPants, midPants, longPants],
      requiredWarmth: 25,
      baby: { activityLevel: "medium" },
    });
    const codes = ranked.map((r) => r.variant.category_code).sort();
    assert.deepEqual(codes, ["pants_long", "pants_mid"]);
  });

  it("picks the closest other type, not a same-type fabric", () => {
    const nearbyLong = row({
      category_code: "tshirt_long",
      warmth_value: 18,
      consumer_label: "长袖T恤",
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
      outfit_slot: "base_top",
      sort_order: 6,
    });
    const ranked = rankSlotAlternatives({
      current: cottonTee,
      candidates: [...teePool, nearbyLong],
      requiredWarmth: 15,
      baby: { activityLevel: "high" },
    });
    assert.deepEqual(
      ranked.map((r) => r.variant.category_code),
      ["tshirt_long"]
    );
  });

  it("picks cotton for the other type even if modal is closer in warmth", () => {
    const midModal = row({
      category_code: "pants_mid",
      warmth_value: 38,
      consumer_label: "中裤",
      material: "modal",
      thickness: "thin",
      fit_type: "regular",
      outfit_slot: "bottom",
      sort_order: 1,
    });
    const midCotton = row({
      category_code: "pants_mid",
      warmth_value: 44,
      consumer_label: "中裤",
      material: "cotton",
      thickness: "medium",
      fit_type: "regular",
      outfit_slot: "bottom",
      sort_order: 2,
    });
    const ranked = rankSlotAlternatives({
      current: shortPants,
      candidates: [shortPants, midModal, midCotton],
      requiredWarmth: 25,
      baby: { activityLevel: "high" },
    });
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]!.variant.material, "cotton");
  });

  it("drops far-warmer long sleeves in a hot pick", () => {
    const ranked = rankSlotAlternatives({
      current: cottonTee,
      candidates: teePool,
      requiredWarmth: 15,
      baby: { activityLevel: "low" },
    });
    assert.ok(ranked.every((r) => r.variant.category_code !== "tshirt_long"));
  });

  it("returns empty when only the current row exists", () => {
    const ranked = rankSlotAlternatives({
      current: cottonTee,
      candidates: [cottonTee],
      requiredWarmth: 15,
      baby: { activityLevel: "low" },
    });
    assert.equal(ranked.length, 0);
  });

  it("socks rank by sock height, then material in same height", () => {
    const ankleCotton = row({
      category_code: "socks",
      warmth_value: 23,
      consumer_label: "袜子 · 轻薄透气",
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
      sock_height: "ankle",
      sort_order: 1,
    });
    const midCalfCotton = row({
      category_code: "socks",
      warmth_value: 26,
      consumer_label: "袜子 · 轻薄透气 中筒",
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
      sock_height: "mid_calf",
      sort_order: 2,
    });
    const overCalfWool = row({
      category_code: "socks",
      warmth_value: 38,
      consumer_label: "袜子 · 厚实羊毛 长筒",
      material: "wool",
      thickness: "thick",
      fit_type: "regular",
      sock_height: "over_calf",
      sort_order: 3,
    });
    const ankleModal = row({
      category_code: "socks",
      warmth_value: 21,
      consumer_label: "袜子 · 丝滑亲肤",
      material: "modal",
      thickness: "thin",
      fit_type: "regular",
      sock_height: "ankle",
      sort_order: 4,
    });

    const pool = [ankleCotton, midCalfCotton, overCalfWool, ankleModal];
    const ranked = rankSlotAlternatives({
      current: ankleCotton,
      candidates: pool,
      requiredWarmth: 23,
      baby: { activityLevel: "medium" },
    });

    const heights = ranked
      .filter((r) => r.tier === "primary_axis")
      .map((r) => r.variant.sock_height);
    assert.ok(heights.includes("mid_calf"), "expected mid_calf pick");
    assert.ok(heights.includes("over_calf"), "expected over_calf pick");
    assert.ok(!heights.includes("ankle"), "should not offer other ankle height group");

    const materialPick = ranked.find((r) => r.tier === "material");
    assert.ok(materialPick, "expected same-height material alternative");
    assert.equal(materialPick!.variant.material, "modal");
  });

  it("same-category bodysuit 款式/面料 are not swap options", () => {
    const triangleCotton = row({
      category_code: "bodysuit_short",
      warmth_value: 15,
      consumer_label: "包屁衣",
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
      bodysuit_style: "triangle",
      sort_order: 1,
    });
    const longLegCotton = row({
      category_code: "bodysuit_short",
      warmth_value: 19,
      consumer_label: "包屁衣",
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
      bodysuit_style: "long_leg",
      sort_order: 2,
    });
    const triangleModal = row({
      category_code: "bodysuit_short",
      warmth_value: 13,
      consumer_label: "包屁衣",
      material: "modal",
      thickness: "thin",
      fit_type: "regular",
      bodysuit_style: "triangle",
      sort_order: 3,
    });

    const ranked = rankSlotAlternatives({
      current: triangleCotton,
      candidates: [triangleCotton, longLegCotton, triangleModal],
      requiredWarmth: 15,
      baby: { activityLevel: "medium" },
    });

    assert.equal(ranked.length, 0);
  });

  it("hats are functional and have no swap list", () => {
    const sun = row({
      category_code: "hat",
      warmth_value: 19,
      consumer_label: "遮阳帽",
      hat_kind: "sun",
      material: "polyester",
      thickness: "thin",
      sort_order: 1,
    });
    const everyday = row({
      category_code: "hat",
      warmth_value: 24,
      consumer_label: "日常帽",
      hat_kind: "everyday",
      material: "cotton",
      thickness: "medium",
      sort_order: 2,
    });
    const warm = row({
      category_code: "hat",
      warmth_value: 32,
      consumer_label: "保暖帽",
      hat_kind: "warm",
      material: "fleece",
      thickness: "thick",
      sort_order: 3,
    });
    const ranked = rankSlotAlternatives({
      current: sun,
      candidates: [sun, everyday, warm],
      requiredWarmth: 19,
      baby: { activityLevel: "medium" },
    });
    assert.equal(ranked.length, 0);
  });

  it("防晒衣 is not a swap target for other outers", () => {
    const shell = row({
      category_code: "outer_shell",
      warmth_value: 40,
      consumer_label: "春秋外套",
      material: "polyester",
      thickness: "medium",
      outfit_slot: "outer",
      sort_order: 1,
    });
    const uv = row({
      category_code: "outer_uv",
      warmth_value: 38,
      consumer_label: "防晒衣",
      material: "polyester",
      thickness: "thin",
      outfit_slot: "outer",
      sort_order: 2,
    });
    const cotton = row({
      category_code: "outer_cotton",
      warmth_value: 55,
      consumer_label: "棉衣",
      material: "cotton",
      thickness: "thick",
      outfit_slot: "outer",
      sort_order: 3,
    });
    const fromShell = rankSlotAlternatives({
      current: shell,
      candidates: [shell, uv, cotton],
      requiredWarmth: 40,
      baby: { activityLevel: "medium" },
    });
    assert.deepEqual(
      fromShell.map((r) => r.variant.category_code),
      ["outer_cotton"]
    );

    const fromUv = rankSlotAlternatives({
      current: uv,
      candidates: [shell, uv, cotton],
      requiredWarmth: 38,
      baby: { activityLevel: "medium" },
    });
    assert.equal(fromUv.length, 0);
  });
});

describe("applySlotSwap", () => {
  it("applies the selected alternative and parks the previous as last", () => {
    const current = {
      kind: "category" as const,
      id: "cat:pants_short",
      label: "短裤",
      category: "pants_short" as const,
      warmthValue: 25,
      alternatives: [
        {
          item: {
            kind: "category" as const,
            id: "cat:pants_mid",
            label: "中裤",
            subtitle: "纯棉日常",
            category: "pants_mid" as const,
            warmthValue: 28,
          },
          reason: "换成这个裤型：同一层，保暖接近",
        },
        {
          item: {
            kind: "category" as const,
            id: "cat:pants_long",
            label: "长裤",
            subtitle: "纯棉日常",
            category: "pants_long" as const,
            warmthValue: 32,
          },
          reason: "换成这个裤型：同一层，保暖接近",
        },
      ],
    };
    const next = applySlotSwap(current, 1);
    assert.ok(next);
    assert.equal(next.label, "长裤");
    assert.equal(next.warmthValue, 25, "slot allocation warmth should stay on the card");
    assert.equal(next.alternatives?.length, 2);
    assert.equal(next.alternatives?.[0]?.item.label, "中裤");
    assert.equal(next.alternatives?.[1]?.item.label, "短裤");
  });

  it("returns null when there is nothing to swap", () => {
    assert.equal(
      applySlotSwap(
        {
          kind: "category",
          id: "cat:socks",
          label: "袜子",
          category: "socks",
        },
        0
      ),
      null
    );
  });
});

describe("rotateSlotSwap", () => {
  it("still applies the first alternative for legacy callers", () => {
    const current = {
      kind: "category" as const,
      id: "cat:tshirt_short",
      label: "T恤",
      category: "tshirt_short" as const,
      alternatives: [
        {
          item: {
            kind: "category" as const,
            id: "cat:tshirt_short",
            label: "T恤",
            subtitle: "轻薄透气",
            category: "tshirt_short" as const,
          },
          reason: "换成莫代尔：体感更凉，出汗更快干",
        },
      ],
    };
    const next = rotateSlotSwap(current);
    assert.ok(next);
    assert.equal(next.reason, "换成莫代尔：体感更凉，出汗更快干");
    assert.equal(next.item.subtitle, "轻薄透气");
  });
});
