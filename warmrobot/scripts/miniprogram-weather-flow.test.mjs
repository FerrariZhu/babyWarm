import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../miniprogram/pages/home/index.js", import.meta.url), "utf8");
const sampleWeather = {
  temp: 21, feelsLike: 20, humidity: 60, windSpeed: 2.4,
  text: "晴", observedAt: "2026-09-28T13:00", location: { name: "当前位置" },
};

function createPage({ locationError } = {}) {
  const storage = new Map();
  const requests = [];
  const wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    getLocation: ({ success, fail }) => locationError
      ? fail(locationError)
      : success({ latitude: 31.2, longitude: 121.5 }),
    request: ({ success }) => success({
      statusCode: 200,
      data: { principalSubdivision: "上海市", city: "上海市", locality: "浦东新区" },
    }),
    chooseLocation: ({ success }) => success({ latitude: 30.2, longitude: 120.1, name: "西湖" }),
    stopPullDownRefresh: () => {},
    openSetting: () => {},
    reLaunch: () => {},
  };
  let definition;
  vm.runInNewContext(source, {
    wx,
    Page: (value) => { definition = value; },
    require: () => ({
      authenticatedRequest: async (path, method, body) => {
        requests.push({ path, method, body });
        return { statusCode: 200, data: { ...sampleWeather, location: { name: body?.city || "当前位置" } } };
      },
      clearSession: () => {},
    }),
    Date,
  });
  const page = {
    ...definition,
    data: { ...definition.data },
    setData(patch) { Object.assign(this.data, patch); },
  };
  return { page, requests, storage };
}

test("小程序当前定位直接提交坐标并展示天气", async () => {
  const { page, requests } = createPage();
  await page.refreshCurrentLocation();
  assert.equal(requests[0].path, "/api/profile/location");
  assert.equal(requests[0].body.latitude, 31.2);
  assert.equal(requests[0].body.longitude, 121.5);
  assert.equal(page.data.weather.temp, 21);
  assert.equal(requests[0].body.city, "上海市浦东新区");
  assert.equal(page.data.weather.location, "上海市浦东新区");
});

test("手动选择地点后刷新沿用已保存地点", async () => {
  const { page, requests, storage } = createPage();
  await page.selectLocation();
  assert.equal(requests[0].body.city, "西湖");
  assert.equal(storage.get("warmrobot_last_weather").source, "手动选择");
  await page.refreshSavedLocation();
  assert.equal(requests[1].path, "/api/weather");
  assert.equal(page.data.weather.source, "手动选择");
});

test("定位被拒绝时保留已有天气并提示用户", async () => {
  const { page, requests } = createPage({ locationError: { errMsg: "getLocation:fail auth deny" } });
  page.data.weather = { temp: 18 };
  await page.refreshCurrentLocation();
  assert.equal(requests.length, 0);
  assert.equal(page.data.weather.temp, 18);
  assert.match(page.data.error, /手动选择地点/);
});
