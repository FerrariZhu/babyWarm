import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sectionPath = new URL(
  "../web/src/components/stitch/daily-advice-section.tsx",
  import.meta.url
);
const recordPath = new URL(
  "../web/src/components/stitch/dressing-record-list.tsx",
  import.meta.url
);

test("home checklist renders a single 今日穿搭 section", async () => {
  const source = await readFile(sectionPath, "utf8");

  assert.match(source, /outfitHeading:\s*"今日穿搭"/);
  assert.match(source, /source\.outfitItems/);
  assert.doesNotMatch(source, /indoorHeading:\s*"家里穿"/);
  assert.doesNotMatch(source, /outdoorHeading:\s*"出门再加"/);
});

test("dressing records show one unified outfit row", async () => {
  const source = await readFile(recordPath, "utf8");

  assert.match(source, /heading="今日穿搭" value=\{summary\.outfit\}/);
  assert.doesNotMatch(source, /heading="家里穿"/);
  assert.doesNotMatch(source, /heading="出门再加"/);
});
