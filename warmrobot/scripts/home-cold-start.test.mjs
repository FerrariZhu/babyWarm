import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../web/src/app/page.tsx", import.meta.url);

test("home cold start shows the add-baby prompt instead of generated advice", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /baby && brief && \([\s\S]*?<DailyAdviceSection/);
  assert.match(source, /\{!baby && \([\s\S]*?<AddBabyChecklistPrompt/);
  assert.match(source, /requiredWarmth=\{baby \? brief\.advice\.current\.requiredWarmth : null\}/);
});
