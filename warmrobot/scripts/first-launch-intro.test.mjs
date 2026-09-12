import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL(
  "../web/src/components/onboarding/first-launch-intro.tsx",
  import.meta.url,
);
const loginPageUrl = new URL("../web/src/app/login/page.tsx", import.meta.url);
const globalsCssUrl = new URL("../web/src/app/globals.css", import.meta.url);

test("login renders the versioned first-launch introduction before authentication", async () => {
  const [component, loginPage] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(loginPageUrl, "utf8"),
  ]);

  assert.match(loginPage, /FirstLaunchIntro/);
  assert.match(loginPage, /<FirstLaunchIntro\s*\/\s*>/);
  assert.match(component, /warmrobot:first-launch-intro:v1/);
  assert.match(component, /INTRO_DURATION_MS\s*=\s*12_000/);
});

test("intro uses the approved child monologue and can always be skipped", async () => {
  const [component, globalsCss] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(globalsCssUrl, "utf8"),
  ]);

  assert.match(component, /嗨，我是暖暖！/);
  assert.match(component, /暖宝宝会看现在的天气，告诉你今天该穿些什么。/);
  assert.match(component, /出门带伞、防晒，也会提醒你。每天看一眼，穿得刚刚好！/);
  assert.match(component, />跳过</);
  assert.match(globalsCss, /prefers-reduced-motion:\s*reduce/);
});

test("intro ships local media and does not expose a replay control", async () => {
  const component = await readFile(componentUrl, "utf8");

  assert.match(component, /onboarding-boy-keyframe-v1\.png/);
  assert.match(component, /warmbaby-intro-v1\.wav/);
  assert.doesNotMatch(component, /再次观看|重新播放/);
});
