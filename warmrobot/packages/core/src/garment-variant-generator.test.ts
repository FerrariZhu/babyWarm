import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateGarmentVariants } from "./garment-variant-generator";

describe("generateGarmentVariants", () => {
  it("generates expected total row count", () => {
    const rows = generateGarmentVariants();
    assert.equal(rows.length, 321);
  });

  it("assigns unique axis tuples per category", () => {
    const rows = generateGarmentVariants();
    const keys = rows.map(
      (r) =>
        `${r.category_code}|${r.material}|${r.fill_type}|${r.thickness}|${r.fit_type}|${r.bodysuit_style}|${r.pant_length}|${r.sock_height}|${r.hat_kind}`
    );
    assert.equal(new Set(keys).size, rows.length);
  });

  it("hat has three hat_kind rows only", () => {
    const hat = generateGarmentVariants().filter((r) => r.category_code === "hat");
    assert.equal(hat.length, 3);
    assert.deepEqual(hat.map((r) => r.hat_kind).sort(), ["everyday", "sun", "warm"]);
  });

  it("vest_down uses down material only", () => {
    const vestDown = generateGarmentVariants().filter((r) => r.category_code === "vest_down");
    assert.ok(vestDown.length > 0);
    assert.ok(vestDown.every((r) => r.material === "down"));
  });

  it("shoes_sandal has single variant without thickness axis", () => {
    const sandal = generateGarmentVariants().filter((r) => r.category_code === "shoes_sandal");
    assert.equal(sandal.length, 1);
    assert.equal(sandal[0]?.thickness, null);
  });

  it("bodysuit has no brief style", () => {
    const bodysuits = generateGarmentVariants().filter((r) =>
      r.category_code.startsWith("bodysuit_")
    );
    assert.ok(bodysuits.every((r) => r.bodysuit_style !== "brief"));
  });

  it("modal only on bodysuits", () => {
    const modal = generateGarmentVariants().filter((r) => r.material === "modal");
    assert.ok(modal.every((r) => r.category_code.startsWith("bodysuit_")));
  });
});
