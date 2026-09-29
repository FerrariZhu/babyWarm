import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../web/src/lib/device-place.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("设备坐标反查展示具体行政位置", async () => {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, URL, AbortController,
    window: { setTimeout, clearTimeout },
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.host, "api-bdc.net");
      assert.equal(url.searchParams.get("latitude"), "31.2");
      return { ok: true, json: async () => ({
        principalSubdivision: "上海市", city: "上海市", locality: "浦东新区",
      }) };
    },
  });
  assert.equal(await exports.resolveDevicePlace(31.2, 121.5), "上海市浦东新区");
});

test("缺少地名时不把当前位置当作具体地名", () => {
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, AbortController, window: { setTimeout, clearTimeout } });
  assert.equal(exports.formatDevicePlace({}), null);
});
