import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sectionPath = new URL(
  "../web/src/components/stitch/daily-advice-section.tsx",
  import.meta.url
);
const pickerPath = new URL(
  "../web/src/components/stitch/garment-choice-picker.tsx",
  import.meta.url
);
const cssPath = new URL("../web/src/app/globals.css", import.meta.url);

test("checklist sections render one full-width garment card per row", async () => {
  const source = await readFile(sectionPath, "utf8");

  assert.match(source, /className="grid grid-cols-1 gap-stack-gap overflow-visible"/);
  assert.doesNotMatch(source, /className="grid grid-cols-2 gap-stack-gap overflow-visible"/);
});

test("category switching is a quiet icon beside the category title", async () => {
  const [section, picker] = await Promise.all([
    readFile(sectionPath, "utf8"),
    readFile(pickerPath, "utf8"),
  ]);

  assert.match(section, /className="garment-title-row"/);
  assert.match(section, /iconName="swap_horiz"/);
  assert.match(section, /className="garment-category-swap"/);
  assert.doesNotMatch(section, /<GarmentChoicePicker[\s\S]{0,180}label="品类"[\s\S]{0,180}iconOnly\s*\/>[\s\S]{0,100}<\/div>\s*<CardBody/);
  assert.match(picker, /iconName\?: string/);
  assert.match(picker, /name=\{iconName\}/);
});

test("single-column cards keep a readable type scale and horizontal anatomy", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.garment-card-layout\s*\{[^}]*grid-template-columns:\s*88px minmax\(0, 1fr\)/s);
  assert.match(css, /\.garment-card-title\s*\{[^}]*font-size:\s*clamp\(20px, 5\.4vw, 26px\)/s);
  assert.match(css, /\.garment-card-subtitle\s*\{[^}]*font-size:\s*clamp\(12px, 3\.4vw, 15px\)/s);
  assert.match(css, /\.garment-category-swap \.garment-picker-trigger--icon\s*\{[^}]*min-height:\s*44px[^}]*min-width:\s*44px/s);
  assert.match(css, /\.garment-category-swap \.material-symbols-outlined\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /@media \(min-width: 430px\)[\s\S]*\.garment-card-layout\s*\{[^}]*grid-template-columns:\s*96px minmax\(0, 1fr\) minmax\(136px, \.72fr\)/s);
});
