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
  assert.match(component, /warmrobot:first-launch-intro:v2/);
});

test("intro plays the supplied local video and can always be skipped", async () => {
  const [component, globalsCss] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(globalsCssUrl, "utf8"),
  ]);

  assert.match(component, /src="\/animations\/warmbaby-first-launch-v2\.mp4"/);
  assert.match(component, /<video/);
  assert.match(component, /autoPlay/);
  assert.match(component, /playsInline/);
  assert.match(component, /onEnded=\{finishIntro\}/);
  assert.match(component, />跳过</);
  assert.match(globalsCss, /prefers-reduced-motion:\s*reduce/);
});

test("intro no longer loads the superseded picture-book media", async () => {
  const component = await readFile(componentUrl, "utf8");

  assert.doesNotMatch(component, /onboarding-boy-keyframe-v1\.png/);
  assert.doesNotMatch(component, /warmbaby-intro-v1\.wav/);
  assert.doesNotMatch(component, /再次观看|重新播放/);
});
