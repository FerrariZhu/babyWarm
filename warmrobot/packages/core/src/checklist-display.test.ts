/**
 * Per-category checklist chips: 面料 + the axis parents actually pick.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdviceItem } from "./daily-brief-types";
import type { ClothingCategory } from "./types";
import {
  checklistDisplayChips,
  type ChecklistDisplayChip,
} from "./checklist-display";

function item(
  category: ClothingCategory,
  extra: Partial<AdviceItem> = {}
): AdviceItem {
  return {
    kind: "category",
    id: `cat:${category}`,
    label: category,
    category,
    ...extra,
  };
}

function line(chips: ChecklistDisplayChip[]): string {
  return chips.map((c) => `${c.label} ${c.value}`).join(" · ");
}

describe("checklistDisplayChips", () => {
  it("T恤 shows 面料 + 版型, including 标准", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("tshirt_short", { material: "cotton", fitType: "regular" })
        )
      ),
      "面料 纯棉 · 版型 标准"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("tshirt_long", { material: "polyester", fitType: "loose" })
        )
      ),
      "面料 速干面料 · 版型 宽松"
    );
  });

  it("包屁衣 shows 面料 + 款式, never 版型", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("bodysuit_short", {
            material: "cotton",
            fitType: "regular",
            bodysuitStyle: "triangle",
          })
        )
      ),
      "面料 纯棉 · 款式 三角款"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("bodysuit_long", {
            material: "modal",
            fitType: "regular",
            bodysuitStyle: "long_leg",
          })
        )
      ),
      "面料 莫代尔 · 款式 长裤款"
    );
  });

  it("袜子 shows 面料 + 袜筒, including 船袜", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("socks", {
            material: "cotton",
            fitType: "regular",
            sockHeight: "no_show",
          })
        )
      ),
      "面料 纯棉 · 袜筒 船袜"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("socks", { material: "polyester", sockHeight: "ankle" })
        )
      ),
      "面料 速干面料 · 袜筒 短筒"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("socks", { material: "cotton", sockHeight: "mid_calf" })
        )
      ),
      "面料 纯棉 · 袜筒 中筒"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("socks", { material: "cotton", sockHeight: "over_calf" })
        )
      ),
      "面料 纯棉 · 袜筒 长筒"
    );
  });

  it("帽子 is functional — no 面料 / 版型 chips", () => {
    assert.deepEqual(
      checklistDisplayChips(
        item("hat", { material: "cotton", fitType: "regular", hatKind: "sun" })
      ),
      []
    );
    assert.deepEqual(
      checklistDisplayChips(
        item("hat", { hatKind: "warm", material: "wool", thickness: "thick" })
      ),
      []
    );
  });

  it("防晒衣 is functional — no chips (title already says 防晒)", () => {
    assert.deepEqual(
      checklistDisplayChips(
        item("outer_uv", { material: "polyester", fitType: "regular", thickness: "thin" })
      ),
      []
    );
  });

  it("长裤 shows 面料 + 裤长, not 版型", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("pants_long", {
            material: "cotton",
            fitType: "loose",
            pantLength: "nine_tenth",
          })
        )
      ),
      "面料 纯棉 · 裤长 九分"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("pants_long", {
            material: "fleece",
            fitType: "regular",
            pantLength: "full_length",
          })
        )
      ),
      "面料 抓绒 · 裤长 全长"
    );
  });

  it("短裤 / 围巾 / 手套 show 面料 only (no meaningful 版型)", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("pants_short", { material: "cotton", fitType: "regular" })
        )
      ),
      "面料 纯棉"
    );
    assert.equal(
      line(checklistDisplayChips(item("scarf", { material: "wool", thickness: "thick" }))),
      "面料 羊毛"
    );
    assert.equal(
      line(checklistDisplayChips(item("gloves", { material: "fleece" }))),
      "面料 抓绒"
    );
  });

  it("秋衣 / 毛衣 / 卫衣 / 马甲 / 外套 / 棉衣 / 秋裤 / 中裤 show 面料 + 版型", () => {
    const cases: Array<[ClothingCategory, string, string, string]> = [
      ["thermal_top", "cotton", "slim", "面料 纯棉 · 版型 修身"],
      ["sweater", "wool", "loose", "面料 羊毛 · 版型 宽松"],
      ["fleece_top", "fleece", "regular", "面料 抓绒 · 版型 标准"],
      ["vest", "cotton", "loose", "面料 纯棉 · 版型 宽松"],
      ["outer_shell", "polyester", "regular", "面料 速干面料 · 版型 标准"],
      ["outer_cotton", "cotton", "loose", "面料 纯棉 · 版型 宽松"],
      ["long_johns", "cotton", "slim", "面料 纯棉 · 版型 修身"],
      ["pants_mid", "cotton", "loose", "面料 纯棉 · 版型 宽松"],
    ];
    for (const [category, material, fitType, expected] of cases) {
      assert.equal(
        line(checklistDisplayChips(item(category, { material, fitType }))),
        expected,
        category
      );
    }
  });

  it("羽绒马甲 hides redundant 羽绒 面料; 羽绒服 shows 充绒 + 版型", () => {
    assert.equal(
      line(
        checklistDisplayChips(
          item("vest_down", { material: "down", fitType: "loose", thickness: "thick" })
        )
      ),
      "版型 宽松"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("outer_down", {
            material: "down",
            fitType: "regular",
            thickness: "lightweight",
          })
        )
      ),
      "充绒 轻量 · 版型 标准"
    );
    assert.equal(
      line(
        checklistDisplayChips(
          item("outer_down", {
            material: "down",
            fitType: "loose",
            thickness: "extreme_cold",
          })
        )
      ),
      "充绒 极寒 · 版型 宽松"
    );
  });

  it("鞋类: 凉鞋无芯片；运动鞋/皮鞋/靴展示 款式", () => {
    assert.deepEqual(checklistDisplayChips(item("shoes_sandal")), []);
    assert.equal(
      line(checklistDisplayChips(item("shoes_sneaker", { thickness: "breathable" }))),
      "款式 透气"
    );
    assert.equal(
      line(checklistDisplayChips(item("shoes_leather", { thickness: "fleece_lined" }))),
      "款式 加绒"
    );
    assert.equal(
      line(checklistDisplayChips(item("shoes_boot", { thickness: "standard" }))),
      "款式 标准"
    );
  });

  it("tip / other have no chips", () => {
    assert.deepEqual(
      checklistDisplayChips({ kind: "tip", id: "diaper", label: "尿布" }),
      []
    );
    assert.deepEqual(checklistDisplayChips(item("other")), []);
  });
});
