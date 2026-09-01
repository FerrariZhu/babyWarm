/**
 * Swap picker presentation: titles show what changed, not a full chip dump.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdviceItem, SlotSwapOption } from "./daily-brief-types";
import {
  describeSwapCurrentRow,
  describeSwapOptionRow,
  inferSwapGroupTier,
} from "./swap-display";

function socks(partial: Partial<AdviceItem> = {}): AdviceItem {
  return {
    kind: "category",
    id: "cat:socks",
    label: "袜子",
    category: "socks",
    material: "polyester",
    sockHeight: "no_show",
    warmthValue: 2,
    ...partial,
  };
}

function tee(partial: Partial<AdviceItem> = {}): AdviceItem {
  return {
    kind: "category",
    id: "cat:tshirt_short",
    label: "短袖 T 恤",
    category: "tshirt_short",
    material: "cotton",
    fitType: "regular",
    warmthValue: 8,
    ...partial,
  };
}

function bodysuit(partial: Partial<AdviceItem> = {}): AdviceItem {
  return {
    kind: "category",
    id: "cat:bodysuit_short",
    label: "短袖包屁衣",
    category: "bodysuit_short",
    material: "cotton",
    bodysuitStyle: "triangle",
    warmthValue: 6,
    ...partial,
  };
}

function longPants(partial: Partial<AdviceItem> = {}): AdviceItem {
  return {
    kind: "category",
    id: "cat:pants_long",
    label: "长裤",
    category: "pants_long",
    material: "cotton",
    pantLength: "full_length",
    warmthValue: 10,
    ...partial,
  };
}

function hat(partial: Partial<AdviceItem> = {}): AdviceItem {
  return {
    kind: "category",
    id: "cat:hat",
    label: "遮阳帽",
    category: "hat",
    hatKind: "sun",
    warmthValue: 4,
    ...partial,
  };
}

function option(
  item: AdviceItem,
  reason: string,
  groupTier?: SlotSwapOption["groupTier"]
): SlotSwapOption {
  return { item, reason, groupTier };
}

describe("describeSwapCurrentRow", () => {
  it("names socks by category, with 筒高 and fabric as detail", () => {
    const row = describeSwapCurrentRow(socks({ sockHeight: "mid_calf" }));
    assert.equal(row.title, "袜子");
    assert.equal(row.detail, "中筒袜 · 速干面料");
    assert.equal(row.showWarmth, true);
    assert.equal(row.warmthValue, 2);
    assert.ok(!row.detail?.includes("袜筒"));
    assert.ok(!row.detail?.includes("面料 "));
  });

  it("keeps bodysuit category as title; 三角款 stays a detail", () => {
    const row = describeSwapCurrentRow(bodysuit());
    assert.equal(row.title, "短袖包屁衣");
    assert.ok(row.detail?.includes("三角款"));
    assert.ok(row.detail?.includes("纯棉"));
  });

  it("keeps long pants category as title; 裤长 stays a detail", () => {
    const row = describeSwapCurrentRow(longPants());
    assert.equal(row.title, "长裤");
    assert.ok(row.detail?.includes("全长裤"));
    assert.ok(row.detail?.includes("纯棉"));
  });

  it("keeps T-shirt category title and only remaining attributes", () => {
    const row = describeSwapCurrentRow(tee({ fitType: "loose" }));
    assert.equal(row.title, "短袖 T 恤");
    assert.equal(row.detail, "宽松 · 纯棉");
  });

  it("hat is named as 帽子, not a fabric line", () => {
    const row = describeSwapCurrentRow(hat());
    assert.equal(row.title, "帽子");
    assert.equal(row.detail, "遮阳帽");
  });
});

describe("describeSwapOptionRow", () => {
  it("sock height options use height name; fabric options use material name", () => {
    const current = socks({ sockHeight: "mid_calf" });
    const height = describeSwapOptionRow(
      option(
        socks({ sockHeight: "ankle", material: "cotton", warmthValue: 2 }),
        "换成短筒袜：透气、穿脱快",
        "primary_axis"
      ),
      current
    );
    assert.equal(height.title, "短筒袜");
    assert.ok(height.detail?.includes("纯棉"));

    const fabric = describeSwapOptionRow(
      option(
        socks({ material: "cotton", sockHeight: "mid_calf" }),
        "换成纯棉：亲肤透气，日常最省心",
        "material"
      ),
      socks({ sockHeight: "mid_calf", material: "polyester" })
    );
    assert.equal(fabric.title, "纯棉");
    assert.equal(fabric.detail, "中筒袜");
  });

  it("cross-category pants keep 中裤 as the title and show 版型·面料", () => {
    const row = describeSwapOptionRow(
      option(
        {
          kind: "category",
          id: "cat:pants_mid",
          label: "中裤",
          category: "pants_mid",
          material: "cotton",
          fitType: "loose",
          warmthValue: 10,
        },
        "换成这个裤型：同一层，保暖接近"
      ),
      {
        kind: "category",
        id: "cat:pants_short",
        label: "短裤",
        category: "pants_short",
        material: "cotton",
        warmthValue: 10,
      }
    );
    assert.equal(row.title, "中裤");
    assert.equal(row.detail, "宽松 · 纯棉");
    assert.equal(row.showWarmth, true);
    assert.equal(row.warmthValue, 10);
  });

  it("cross-category bodysuit uses 短袖包屁衣 with 款式·面料", () => {
    const row = describeSwapOptionRow(
      option(
        {
          kind: "category",
          id: "cat:bodysuit_short",
          label: "包屁衣",
          category: "bodysuit_short",
          material: "modal",
          bodysuitStyle: "triangle",
          warmthValue: 7,
        },
        "换成这个类型：同一层，保暖接近"
      ),
      {
        kind: "category",
        id: "cat:bodysuit_long",
        label: "长袖包屁衣",
        category: "bodysuit_long",
        material: "modal",
        bodysuitStyle: "triangle",
        warmthValue: 7,
      }
    );
    assert.equal(row.title, "短袖包屁衣");
    assert.notEqual(row.title, "三角款");
    assert.equal(row.detail, "三角款 · 莫代尔");
  });

  it("hat options stay a category name, not 帽型", () => {
    const row = describeSwapOptionRow(
      option(
        hat({ label: "保暖帽", hatKind: "warm" }),
        "换成保暖帽：风里把头暖住",
        "primary_axis"
      ),
      hat()
    );
    assert.equal(row.title, "帽子");
    assert.equal(row.detail, "保暖帽");
  });

  it("always shows the option warmth index when present", () => {
    const different = describeSwapOptionRow(
      option(tee({ material: "modal", warmthValue: 6 }), "换成莫代尔：体感更凉，出汗更快干"),
      tee({ warmthValue: 8 })
    );
    assert.equal(different.showWarmth, true);
    assert.equal(different.warmthValue, 6);

    const same = describeSwapOptionRow(
      option(tee({ material: "modal", warmthValue: 8 }), "换成莫代尔：体感更凉，出汗更快干"),
      tee({ warmthValue: 8 })
    );
    assert.equal(same.showWarmth, true);
    assert.equal(same.warmthValue, 8);
  });
});

describe("inferSwapGroupTier", () => {
  it("parks a previous sock height under primary_axis, not 其他可选", () => {
    assert.equal(
      inferSwapGroupTier(
        socks({ sockHeight: "no_show" }),
        socks({ sockHeight: "ankle" })
      ),
      "primary_axis"
    );
  });

  it("parks a previous sock fabric under material", () => {
    assert.equal(
      inferSwapGroupTier(
        socks({ material: "polyester" }),
        socks({ material: "cotton" })
      ),
      "material"
    );
  });
});
