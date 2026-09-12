import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const advicePath = new URL(
  "../web/src/components/stitch/daily-advice-section.tsx",
  import.meta.url
);
const panelPath = new URL(
  "../web/src/components/stitch/advice-conclusion-panel.tsx",
  import.meta.url
);
const weatherPath = new URL(
  "../web/src/components/stitch/weather-widget.tsx",
  import.meta.url
);

test("the advice card owns the clothing index, method, ordered rows, and weather chips", async () => {
  const [advice, panel, weather] = await Promise.all([
    readFile(advicePath, "utf8"),
    readFile(panelPath, "utf8"),
    readFile(weatherPath, "utf8"),
  ]);

  assert.match(advice, /穿衣指数/);
  assert.match(advice, /formatDressingMethod/);
  assert.match(advice, /formatOutfitAdviceRows/);
  assert.match(advice, /pencilGarmentIcon/);
  assert.match(panel, /advice-method/);
  assert.match(panel, /advice-outfit-row/);
  assert.match(panel, /row\.emphasisTerms/);
  assert.match(panel, /advice-garment/);
  assert.match(panel, /advice-tip-chips/);
  assert.doesNotMatch(weather, /weather-index-panel/);
  assert.doesNotMatch(weather, /WeatherTipChips/);
});
