import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const appHeader = readFileSync("web/src/components/stitch/app-header.tsx", "utf8");
const homePage = readFileSync("web/src/app/page.tsx", "utf8");
const rootLayout = readFileSync("web/src/app/layout.tsx", "utf8");
const profile = readFileSync("web/src/lib/baby-profile.ts", "utf8");
const styles = readFileSync("web/src/app/globals.css", "utf8");

test("home uses the shared brand header with the reference tagline and profile entry", () => {
  assert.match(homePage, /headerVariant="brand"/);
  assert.doesNotMatch(homePage, /className="home-brand"/);
  assert.match(appHeader, /好天气，陪你和宝贝一起长大/);
  assert.match(appHeader, /href=\{babyName \? "\/profile" : "\/profile\/add"\}/);
  assert.match(appHeader, /home-nav-baby-name/);
});

test("gender defaults resolve to the matching pencil avatar assets", () => {
  assert.match(profile, /male: "\/avatars\/baby-boy-pencil-v1\.png"/);
  assert.match(profile, /female: "\/avatars\/baby-girl-pencil-v1\.png"/);
  assert.ok(statSync("web/public/avatars/baby-boy-pencil-v1.png").size > 0);
  assert.ok(statSync("web/public/avatars/baby-girl-pencil-v1.png").size > 0);
});

test("brand header includes responsive and accessible interaction styling", () => {
  assert.match(styles, /\.home-nav-baby\s*\{[^}]*min-height:\s*48px/s);
  assert.match(styles, /\.home-nav-baby:focus-visible/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /\.home-nav-sprig/);
});

test("the home subtitle self-hosts Xiaolai without changing the global body face", () => {
  assert.match(rootLayout, /@chinese-fonts\/xiaolai/);
  assert.match(styles, /\.home-nav-subtitle\s*\{[^}]*font-family:\s*"Xiaolai SC"/s);
  assert.doesNotMatch(styles, /--font-body:[^;]*Xiaolai/);
});
