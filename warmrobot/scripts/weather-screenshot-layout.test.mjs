import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const widgetPath = new URL("../web/src/components/stitch/weather-widget.tsx", import.meta.url);
const cssPath = new URL("../web/src/app/globals.css", import.meta.url);

test("weather card follows the four-metric reference hierarchy", async () => {
  const [widget, css] = await Promise.all([readFile(widgetPath, "utf8"), readFile(cssPath, "utf8")]);

  assert.match(widget, /metric: "humidity" \| "uv" \| "wind" \| "temperature"/);
  assert.match(widget, /weather-reading-divider/);
  assert.match(widget, /weather-condition-title/);
  assert.match(widget, /grid-cols-4/);
  assert.match(widget, /metric="temperature"\s+label="体感温度"/);
  assert.match(
    widget,
    /metric="uv"\s+label="紫外线"\s+value=\{`\$\{uv % 1 === 0 \? uv : uv\.toFixed\(1\)\}`\}/,
  );
  assert.doesNotMatch(widget, /function uvLabel/);
  assert.doesNotMatch(widget, /（\$\{uvLabel\(uv\)\}）/);
  assert.match(widget, /weather-index-content/);
  assert.match(widget, /function WeatherControlIcon/);
  assert.match(widget, /function WeatherIndexIcon/);
  assert.match(widget, /pencilGarmentIcon\("garment_tshirt_short"\)/);
  assert.match(widget, /className="weather-index-garment"/);
  assert.doesNotMatch(widget, /<circle cx="16" cy="15\.2"/);
  assert.doesNotMatch(widget, /chevron-right/);
  assert.doesNotMatch(widget, /className="weather-feels-like text-text-soft"/);

  assert.match(css, /\.weather-temperature\s*\{[\s\S]*font-size:\s*clamp\(64px/);
  assert.match(css, /\.weather-metric-icon\s*\{[\s\S]*width:\s*34px/);
  assert.match(css, /\.weather-reading-divider/);
  assert.match(css, /\.weather-footer \.weather-index-panel[\s\S]*grid-template-columns:\s*42px minmax\(0, 1fr\)/);
  assert.match(css, /\.weather-index-garment\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px/);
  assert.match(css, /\.weather-index-content[\s\S]*text-align:\s*left/);
  assert.match(css, /\.weather-footer \.weather-index-heading[^}]*justify-content:\s*flex-start/);
  assert.match(css, /\.weather-index-description[^}]*text-align:\s*left/);
  assert.match(css, /\.font-label-sm\s*\{[\s\S]*font-size:\s*clamp\(9px/);
  assert.match(css, /\.garment-card \.font-label-md[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(css, /\.garment-card \.font-label-md[\s\S]*10cqi/);
  assert.match(css, /\.garment-field-label, \.garment-field-value[\s\S]*text-overflow:\s*ellipsis/);
});

test("weather card keeps a compact vertical rhythm", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.weather-context-row\s*\{[^}]*margin:\s*0 0 6px;[^}]*padding-bottom:\s*4px;/);
  assert.match(css, /\.weather-hero \.weather-overview\s*\{[^}]*min-height:\s*88px;[^}]*margin:\s*0 0 8px;/);
  assert.match(css, /\.weather-metric-cell\s*\{[^}]*min-height:\s*88px;[^}]*padding:\s*6px 2px;/);
  assert.match(css, /\.weather-footer\s*\{[^}]*margin-top:\s*8px;[^}]*padding:\s*10px 12px;/);
  assert.doesNotMatch(css, /\.weather-hero \.weather-overview\s*\{[^}]*min-height:\s*112px/);
  assert.doesNotMatch(css, /\.weather-metric-cell\s*\{[^}]*min-height:\s*116px/);
});
