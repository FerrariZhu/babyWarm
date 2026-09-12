import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicRoot = path.resolve("web/public/illustrations/pencil-system");

const weatherIcons = [
  "weather-clear-day", "weather-clear-night", "weather-partly-day",
  "weather-partly-night", "weather-cloudy", "weather-fog", "weather-drizzle",
  "weather-rain", "weather-heavy-rain", "weather-sleet", "weather-light-snow",
  "weather-heavy-snow", "weather-shower", "weather-thunderstorm", "metric-wind",
  "metric-humidity", "metric-uv", "metric-temperature", "tip-umbrella", "metric-pressure",
];

const garmentIcons = [
  "garment_bodysuit_short", "garment_bodysuit_long", "garment_tshirt_short",
  "garment_tshirt_long", "garment_thermal_top", "garment_sweater", "garment_fleece_top",
  "garment_vest", "garment_vest_down", "garment_outer_uv", "garment_outer_shell",
  "garment_outer_cotton", "garment_outer_down", "garment_long_johns", "garment_pants_short",
  "garment_pants_mid", "garment_pants_long", "garment_shoes_sandal", "garment_shoes_sneaker",
  "garment_shoes_leather", "garment_shoes_boot", "garment_hat_sun", "garment_hat_warm",
  "garment_scarf", "garment_gloves", "garment_socks",
];

function isPaperBackground(red, green, blue) {
  const lightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return red >= 226 && green >= 224 && blue >= 210 && lightest - darkest <= 34;
}

function clearConnectedPaperBackground(data, width, height, channels) {
  const visited = new Uint8Array(width * height);
  const pending = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const visit = (pixelIndex) => {
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * channels;
    if (!isPaperBackground(data[offset], data[offset + 1], data[offset + 2])) return;
    visited[pixelIndex] = 1;
    data[offset + 3] = 0;
    pending[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(y * width);
    visit(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = pending[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) visit(pixelIndex - 1);
    if (x < width - 1) visit(pixelIndex + 1);
    if (y > 0) visit(pixelIndex - width);
    if (y < height - 1) visit(pixelIndex + width);
  }
}

function visibleBounds(data, width, height, channels) {
  const alphaChannel = channels - 1;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + alphaChannel] <= 4) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return { left: 0, top: 0, width, height };
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function exportTransparentIcon({ master, destination, left, top, size, fillFrame = false }) {
  const image = sharp(master).extract({ left, top, width: size, height: size }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  clearConnectedPaperBackground(data, info.width, info.height, info.channels);
  const temporaryPath = `${destination}.tmp.png`;
  let output = sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  });
  if (fillFrame) {
    output = output
      .extract(visibleBounds(data, info.width, info.height, info.channels))
      .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  await output.png().toFile(temporaryPath);
  await rename(temporaryPath, destination);
}

async function exportGrid({ masterName, directoryName, icons, columns, cellSize, columnOffsets, rowOffsets, fillFrame }) {
  const master = path.join(publicRoot, masterName);
  const directory = path.join(publicRoot, directoryName);
  await mkdir(directory, { recursive: true });
  await Promise.all(icons.map((icon, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return exportTransparentIcon({
      master,
      destination: path.join(directory, `${icon}.png`),
      left: columnOffsets[column],
      top: rowOffsets[row],
      size: cellSize,
      fillFrame,
    });
  }));
}

await exportGrid({
  masterName: "weather-icon-master-v2.png",
  directoryName: "weather",
  icons: weatherIcons,
  columns: 5,
  cellSize: 280,
  columnOffsets: [0, 280, 561, 841, 1122],
  rowOffsets: [0, 280, 561, 841],
  fillFrame: false,
});

await exportGrid({
  masterName: "garment-icon-master-v2.png",
  directoryName: "garments",
  icons: garmentIcons,
  columns: 7,
  cellSize: 237,
  columnOffsets: [0, 237, 474, 711, 948, 1185, 1422],
  rowOffsets: [0, 237, 474, 711],
  fillFrame: true,
});
