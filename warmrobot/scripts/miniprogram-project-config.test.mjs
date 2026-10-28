import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("all supported import directories use the same real Mini Program AppID", () => {
  const configs = [readJson("../../project.config.json"), readJson("../project.config.json"), readJson("../miniprogram/project.config.json")];
  assert.match(configs[0].appid, /^wx[0-9a-f]{16}$/);
  for (const config of configs) {
    assert.equal(config.appid, configs[0].appid);
    assert.equal(config.compileType, "miniprogram");
  }
});

test("native login, home and baby-profile pages are registered and complete", () => {
  const app = readJson("../miniprogram/app.json");
  for (const page of ["pages/login/index", "pages/home/index", "pages/profile/index"]) {
    assert.ok(app.pages.includes(page));
    for (const extension of ["js", "json", "wxml", "wxss"]) {
      assert.ok(existsSync(new URL(`../miniprogram/${page}.${extension}`, import.meta.url)), `${page}.${extension} must exist`);
    }
  }
});
