import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginPageUrl = new URL("../web/src/app/login/page.tsx", import.meta.url);

test("登录页在表单下方展示可用的 Demo 账号", async () => {
  const loginPage = await readFile(loginPageUrl, "utf8");

  assert.match(loginPage, /aria-label="Demo 账号"/);
  assert.match(loginPage, /demo_user_1@warmrobot\.dev/);
  assert.match(loginPage, /password123/);

  const formEnd = loginPage.indexOf("</form>");
  const demoAccount = loginPage.indexOf('aria-label="Demo 账号"');
  assert.ok(formEnd !== -1 && demoAccount > formEnd, "Demo 账号应显示在登录表单下方");
});
