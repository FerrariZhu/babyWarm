import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("consumer login page never advertises or autofills a public shared account", async () => {
  const page = await readFile(new URL("../web/src/app/login/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /demo_user_1|password123|填入测试账号|aria-label="测试账号"/);
  assert.match(page, /handleEmailLogin/);
});
