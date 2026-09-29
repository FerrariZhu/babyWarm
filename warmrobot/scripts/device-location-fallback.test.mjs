import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../web/src/lib/device-location.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("低精度定位超时后尝试高精度定位并返回设备坐标", async () => {
  const optionsSeen = [];
  let clearedWatch = false;
  const navigator = { geolocation: {
    getCurrentPosition: (_success, fail, options) => {
      optionsSeen.push(options);
      fail({ code: 3, TIMEOUT: 3 });
    },
    watchPosition: (success, _fail, options) => {
      optionsSeen.push(options);
      setTimeout(() => success({ coords: { latitude: 31.2, longitude: 121.5, accuracy: 25 } }), 0);
      return 7;
    },
    clearWatch: (id) => {
      assert.equal(id, 7);
      clearedWatch = true;
    },
  } };
  const exports = {};
  vm.runInNewContext(compiled, { exports, navigator, setTimeout, clearTimeout });

  const coords = await exports.getDeviceLocation();
  assert.equal(coords.latitude, 31.2);
  assert.equal(coords.longitude, 121.5);
  assert.equal(optionsSeen[0].enableHighAccuracy, false);
  assert.equal(optionsSeen[1].enableHighAccuracy, true);
  assert.equal(optionsSeen[1].maximumAge, 0);
  assert.equal(clearedWatch, true);
});
