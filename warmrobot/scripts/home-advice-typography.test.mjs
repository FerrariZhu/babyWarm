import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../web/src/app/globals.css", import.meta.url);

test("home advice and checklist keep a compact reading scale", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.advice-surface \.advice-heading\s*\{\s*font-size:\s*clamp\(18px, 4\.8vw, 22px\)/);
  assert.match(css, /\.advice-quote \.advice-wear, \.advice-quote \.advice-support\s*\{\s*font-size:\s*clamp\(16px, 4\.2vw, 19px\)/);
  assert.match(css, /\.outfit-checklist > div:first-child h3\s*\{\s*font-size:\s*clamp\(20px, 5\.2vw, 23px\)/);
  assert.match(css, /\.dressing-save\s*\{\s*min-height:\s*44px;\s*font-size:\s*clamp\(13px, 3\.5vw, 15px\)/);
  assert.match(css, /\.garment-card \.font-label-md[^}]*font-size:\s*clamp\(12px, 10cqi, 17px\)/);
  assert.match(css, /\.garment-card \.font-label-sm[^}]*font-size:\s*clamp\(9px, 7\.5cqi, 13px\)/);
  assert.match(css, /\.garment-card p[^}]*font-size:\s*clamp\(11px, 7\.5cqi, 13px\)/);
});
