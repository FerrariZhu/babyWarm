import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../web/src/app/globals.css", import.meta.url);
const publicRoot = new URL("../web/public/", import.meta.url);
const backgrounds = [
  "weather-hero-paper-v1.png",
  "outfit-advice-paper-v1.png",
  "outdoor-tip-paper-v1.png",
  "checklist-paper-v1.png",
];

test("home modules bind their named pencil-paper backgrounds with a CSS fallback", async () => {
  const source = await readFile(cssPath, "utf8");

  for (const background of backgrounds) {
    assert.match(source, new RegExp(`backgrounds/${background}`));
    await access(new URL(`illustrations/pencil-system/backgrounds/${background}`, publicRoot));
  }

  assert.match(source, /\.weather-hero\.glass-weather[\s\S]*background-color/);
  assert.match(source, /\.advice-surface[\s\S]*background-color/);
  assert.match(source, /\.advice-tips[\s\S]*background-color/);
  assert.match(source, /\.garment-card[\s\S]*background-color/);
});

test("outfit advice uses the approved right-aligned clothing watermark artwork", async () => {
  const asset = await readFile(
    new URL(
      "illustrations/pencil-system/backgrounds/outfit-advice-paper-v1.png",
      publicRoot,
    ),
  );
  const checksum = createHash("sha256").update(asset).digest("hex");

  assert.equal(checksum, "53c9d93760d0b2776ca7c8ce0938b2d1d3d8705477ef83c91e7f2d20fa009d45");
});
