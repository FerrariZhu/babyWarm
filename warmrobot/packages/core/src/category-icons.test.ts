import { describe, expect, it } from "vitest";
import { resolveCategoryIcon } from "./category-icons";
import type { AdviceItem } from "./daily-brief-types";

describe("resolveCategoryIcon", () => {
  const categoryItem = (category: string): AdviceItem => ({
    kind: "category",
    id: category,
    label: "测试",
    category: category as AdviceItem["category"],
  });

  it("uses seed map for sandals", () => {
    expect(resolveCategoryIcon(categoryItem("shoes_sandal")).iconKey).toBe("beach_access");
  });

  it("prefers DB icon_key override", () => {
    expect(
      resolveCategoryIcon(categoryItem("shoes_sandal"), {
        shoes_sandal: { iconKey: "steps" },
      }).iconKey
    ).toBe("steps");
  });

  it("uses custom icon_url when set", () => {
    expect(
      resolveCategoryIcon(categoryItem("hat"), {
        hat: { iconKey: "apparel", iconUrl: "https://example.com/hat.png" },
      })
    ).toEqual({ iconKey: "apparel", iconUrl: "https://example.com/hat.png" });
  });
});
