import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginPageUrl = new URL("../web/src/app/login/page.tsx", import.meta.url);

test("登录页在表单下方展示并可填入测试账号", async () => {
  const loginPage = await readFile(loginPageUrl, "utf8");

  assert.match(loginPage, /aria-label="测试账号"/);
  assert.match(loginPage, />测试账号</);
  assert.match(loginPage, /demo_user_1@warmrobot\.dev/);
  assert.match(loginPage, /password123/);
  assert.match(loginPage, /setEmail\("demo_user_1@warmrobot\.dev"\)/);
  assert.match(loginPage, /setPassword\("password123"\)/);
  assert.match(loginPage, />填入测试账号</);

  const formEnd = loginPage.indexOf("</form>");
  const demoAccount = loginPage.indexOf('aria-label="测试账号"');
  assert.ok(formEnd !== -1 && demoAccount > formEnd, "Demo 账号应显示在登录表单下方");
});
