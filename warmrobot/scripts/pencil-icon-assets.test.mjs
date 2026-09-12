import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const iconModulePath = new URL("../web/src/lib/pencil-icons.ts", import.meta.url);
const publicRoot = new URL("../web/public/", import.meta.url);

const weatherIcons = [
  "weather-clear-day", "weather-clear-night", "weather-partly-day",
  "weather-partly-night", "weather-cloudy", "weather-fog", "weather-drizzle",
  "weather-rain", "weather-heavy-rain", "weather-sleet", "weather-light-snow",
  "weather-heavy-snow", "weather-shower", "weather-thunderstorm", "metric-wind",
  "metric-humidity", "metric-uv", "metric-temperature", "tip-umbrella", "metric-pressure",
];

const garmentIcons = [
  "garment_diaper",
  "garment_bodysuit_short", "garment_bodysuit_long", "garment_tshirt_short",
  "garment_tshirt_long", "garment_thermal_top", "garment_sweater", "garment_fleece_top",
  "garment_vest", "garment_vest_down", "garment_outer_uv", "garment_outer_shell",
  "garment_outer_cotton", "garment_outer_down", "garment_long_johns", "garment_pants_short",
  "garment_pants_mid", "garment_pants_long", "garment_shoes_sandal", "garment_shoes_sneaker",
  "garment_shoes_leather", "garment_shoes_boot", "garment_hat_sun", "garment_hat_warm",
  "garment_scarf", "garment_gloves", "garment_socks",
];

test("pencil icon module covers every weather and garment category asset", async () => {
  const source = await readFile(iconModulePath, "utf8");

  assert.match(source, /const PENCIL_ICON_ROOT = "\/illustrations\/pencil-system"/);
  for (const icon of weatherIcons) {
    assert.match(source, new RegExp(`\\"${icon}\\"`));
    assert.match(source, new RegExp(`/weather/${icon}\\.png`));
  }
  for (const icon of garmentIcons) {
    assert.match(source, new RegExp(`\\"${icon}\\"`));
    assert.match(source, new RegExp(`/garments/${icon}\\.png`));
  }
});

test("pencil icon module maps weather text, metrics, and garment keys to local artwork", async () => {
  const source = await readFile(iconModulePath, "utf8");

  assert.match(source, /export function pencilWeatherIcon/);
  assert.match(source, /export function pencilMetricIcon/);
  assert.match(source, /export function pencilGarmentIcon/);
  assert.match(source, /condition\.includes\("雷"\)/);
  assert.match(source, /condition\.includes\("雪"\)/);
  assert.match(source, /condition\.includes\("雨"\)/);
});

test("every declared pencil icon is exported as a standalone PNG", async () => {
  for (const icon of weatherIcons) {
    await access(new URL(`illustrations/pencil-system/weather/${icon}.png`, publicRoot));
  }
  for (const icon of garmentIcons) {
    await access(new URL(`illustrations/pencil-system/garments/${icon}.png`, publicRoot));
  }
});

test("every standalone pencil icon has a genuinely transparent background", async () => {
  const iconPaths = [
    ...weatherIcons.map((icon) => `illustrations/pencil-system/weather/${icon}.png`),
    ...garmentIcons.map((icon) => `illustrations/pencil-system/garments/${icon}.png`),
  ];

  for (const iconPath of iconPaths) {
    const image = sharp(fileURLToPath(new URL(iconPath, publicRoot)));
    const metadata = await image.metadata();
    assert.equal(metadata.hasAlpha, true, `${iconPath} must have an alpha channel`);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const cornerAlphaOffset = (info.channels - 1);
    assert.equal(data[cornerAlphaOffset], 0, `${iconPath} must be transparent at its top-left corner`);
  }
});

test("garment icons are visually cropped, centered, and enlarged without distortion", async () => {
  const cssPath = new URL("../web/src/app/globals.css", import.meta.url);
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.garment-card \.garment-picture > img\.garment-pencil-icon[\s\S]*object-fit:\s*contain/);
  assert.match(css, /\.garment-card \.garment-picture > img\.garment-pencil-icon[\s\S]*display:\s*block/);

  for (const icon of garmentIcons) {
    const image = sharp(fileURLToPath(new URL(`illustrations/pencil-system/garments/${icon}.png`, publicRoot)));
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const alpha = info.channels - 1;
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + alpha] > 4) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const visibleWidth = maxX - minX + 1;
    const visibleHeight = maxY - minY + 1;
    assert.ok(Math.max(visibleWidth, visibleHeight) >= info.width * 0.95, `${icon} should use nearly the full frame`);
    assert.ok(Math.abs((minX + maxX) / 2 - (info.width - 1) / 2) <= 1, `${icon} should be horizontally centered`);
    assert.ok(Math.abs((minY + maxY) / 2 - (info.height - 1) / 2) <= 1, `${icon} should be vertically centered`);
  }
});
