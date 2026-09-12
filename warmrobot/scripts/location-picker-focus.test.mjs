import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../web/src/components/stitch/location-picker-sheet.tsx", import.meta.url);
const cssPath = new URL("../web/src/app/globals.css", import.meta.url);

test("location search uses one rounded focus surface", async () => {
  const [source, css] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(source, /group[^"`]*focus-within:border-primary/);
  assert.match(source, /group[^"`]*focus-within:ring-2/);
  assert.match(source, /className="[^"`]*outline-none[^"`]*"/);
  assert.doesNotMatch(source, /type="search"/);
  assert.match(source, /role="searchbox"/);
  assert.match(source, /className="[^"`]*location-search-input[^"`]*"/);
  assert.match(css, /\.location-search-input:focus-visible\s*\{[^}]*outline:\s*none/s);
});
