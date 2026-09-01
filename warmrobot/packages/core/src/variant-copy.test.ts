import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateGarmentVariants } from "./garment-variant-generator";
import { buildVariantCopy, VARIANT_COPY_MAX_LEN } from "./variant-copy";

describe("buildVariantCopy", () => {
  it("composes cotton loose thin t-shirt copy from axes", () => {
    const copy = buildVariantCopy({
      category: "tshirt_short",
      material: "cotton",
      fillType: null,
      thickness: "thin",
      fitType: "loose",
      bodysuitStyle: null,
      pantLength: null,
      sockHeight: null,
    });
    assert.match(copy.pros, /棉质亲肤/);
    assert.match(copy.pros, /轻薄透气/);
    assert.match(copy.pros, /宽松好活动/);
    assert.match(copy.cons, /汗后易贴肤/);
    assert.ok(copy.pros.length <= VARIANT_COPY_MAX_LEN, copy.pros);
    assert.ok(copy.cons.length <= VARIANT_COPY_MAX_LEN, copy.cons);
    assert.ok(copy.usageTips.length <= VARIANT_COPY_MAX_LEN, copy.usageTips);
  });

  it("covers shoe categories without material axis", () => {
    const copy = buildVariantCopy({
      category: "shoes_sandal",
      material: null,
      fillType: null,
      thickness: null,
      fitType: "regular",
      bodysuitStyle: null,
      pantLength: null,
      sockHeight: null,
    });
    assert.match(copy.pros, /透气/);
    assert.ok(copy.cons.length <= VARIANT_COPY_MAX_LEN);
  });

  it("weaves bodysuit style into usage", () => {
    const copy = buildVariantCopy({
      category: "bodysuit_short",
      material: "cotton",
      fillType: null,
      thickness: "medium",
      fitType: "regular",
      bodysuitStyle: "triangle",
      pantLength: null,
      sockHeight: null,
    });
    assert.match(copy.usageTips, /换尿布/);
    assert.ok(copy.pros.length <= VARIANT_COPY_MAX_LEN);
  });
});

describe("generateGarmentVariants copy fields", () => {
  it("includes concise non-empty copy on every active row", () => {
    const rows = generateGarmentVariants().filter((r) => r.is_active);
    assert.ok(rows.length >= 300);
    for (const row of rows) {
      assert.ok(row.pros.trim().length > 0, row.admin_label);
      assert.ok(row.cons.trim().length > 0, row.admin_label);
      assert.ok(row.usage_tips.trim().length > 0, row.admin_label);
      assert.ok(
        row.pros.length <= VARIANT_COPY_MAX_LEN,
        `${row.admin_label} pros: ${row.pros} (${row.pros.length})`
      );
      assert.ok(
        row.cons.length <= VARIANT_COPY_MAX_LEN,
        `${row.admin_label} cons: ${row.cons} (${row.cons.length})`
      );
      assert.ok(
        row.usage_tips.length <= VARIANT_COPY_MAX_LEN,
        `${row.admin_label} usage: ${row.usage_tips} (${row.usage_tips.length})`
      );
    }
  });
});
