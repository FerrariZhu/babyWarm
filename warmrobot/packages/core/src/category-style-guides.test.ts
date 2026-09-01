import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupStyleGuidesByCategory,
  mapCategoryStyleGuideRow,
  type CategoryStyleGuideRow,
} from "./category-style-guides";

describe("category-style-guides", () => {
  it("maps row and groups by category code sorted", () => {
    const rows: CategoryStyleGuideRow[] = [
      {
        id: "2",
        category_code: "bodysuit_short",
        title: "B",
        subtitle: null,
        pros: "p",
        cons: "c",
        usage_tips: "u",
        sort_order: 20,
      },
      {
        id: "1",
        category_code: "bodysuit_short",
        title: "A",
        subtitle: "sub",
        pros: "p",
        cons: "c",
        usage_tips: "u",
        sort_order: 10,
      },
      {
        id: "3",
        category_code: "socks",
        title: "S",
        subtitle: null,
        pros: "",
        cons: "",
        usage_tips: "",
        sort_order: 0,
      },
    ];
    const guides = rows.map(mapCategoryStyleGuideRow);
    const grouped = groupStyleGuidesByCategory(guides);
    assert.deepEqual(
      grouped.bodysuit_short?.map((g) => g.title),
      ["A", "B"]
    );
    assert.equal(grouped.bodysuit_short?.[0].subtitle, "sub");
    assert.equal(grouped.socks?.length, 1);
  });
});
