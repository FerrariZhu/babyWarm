import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = (path) => readFileSync(new URL(`../miniprogram/${path}`, import.meta.url), "utf8");
const BABY_ID = "11111111-1111-4111-8111-111111111111";

// Uses real page + session modules, but a deterministic in-memory backend and wx
// adapter. This verifies the native contract, NOT WeChat/compiler/DB integration.
test("native login → create/edit profile → weather/advice → logout contract", async () => {
  const storage = new Map();
  const navigations = [];
  const requests = [];
  const babies = [];
  let weather = null;
  const sessionResult = { access_token: "test-access", refresh_token: "test-refresh", expires_at: Date.now() / 1000 + 3600 };
  const wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    reLaunch: ({ url }) => navigations.push(url),
    navigateTo: ({ url }) => navigations.push(url),
    login: ({ success }) => success({ code: "test-login-code" }),
    getLocation: ({ success }) => success({ latitude: 31.2, longitude: 121.5 }),
    stopPullDownRefresh() {},
    request: (options) => {
      const path = new URL(options.url).pathname;
      requests.push({ path, method: options.method || "GET", data: options.data });
      if (options.url.startsWith("https://api-bdc.net")) {
        return options.success({ statusCode: 200, data: { city: "测试城市" } });
      }
      if (path === "/api/auth/wechat/login") {
        assert.equal(options.data.code, "test-login-code");
        return options.success({ statusCode: 200, data: { session: sessionResult } });
      }
      assert.equal(options.header.Authorization, "Bearer test-access");
      let data;
      if (path === "/api/auth/wechat/logout") {
        assert.equal(options.data.refresh_token, "test-refresh");
        data = { ok: true, revoked: true };
      } else if (path === "/api/profile/location") {
        weather = {
          temp: 20, feelsLike: 19, humidity: 55, windSpeed: 2,
          text: "晴", observedAt: "2026-10-28T10:00:00", location: { name: options.data.city },
        };
        data = weather;
      } else if (path === "/api/babies" && options.method === "POST") {
        data = { ...options.data, id: BABY_ID, is_active: true, wears_diaper: options.data.wears_diaper === "yes" };
        babies.push(data);
      } else if (path === `/api/babies/${BABY_ID}` && options.method === "PATCH") {
        data = Object.assign(babies[0], options.data, { wears_diaper: options.data.wears_diaper === "yes" });
      } else if (path === "/api/babies") {
        data = { babies };
      } else if (path === "/api/miniprogram/daily-brief") {
        data = {
          status: babies.length ? "ready" : "needs_baby", baby: babies[0] || null, babies, weather,
          advice: babies.length ? { current: { outfitItems: [{ id: "top", label: "长袖上衣" }], tags: [], extras: [] } } : null,
          conclusion: "请结合宝宝实际冷热调整。", recommendedDate: "2026-10-28",
        };
      } else throw new Error(`Unexpected synthetic request ${path}`);
      options.success({ statusCode: 200, data });
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(source("utils/session.js"), { module, wx, Date, require: () => ({ API_BASE: "https://test.invalid" }) });
  const session = module.exports;
  const loadPage = (name) => {
    let definition;
    vm.runInNewContext(source(`pages/${name}/index.js`), {
      wx, Date, Page: (value) => { definition = value; },
      require: (name) => name.endsWith("/config") ? { API_BASE: "https://test.invalid" } : session,
    });
    return { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  };

  const login = loadPage("login");
  await login.onLoad();
  assert.equal(navigations.length, 0);
  await login.onGetPhoneNumber({ detail: { code: "test-phone-code" } });
  assert.equal(navigations.at(-1), "/pages/home/index");
  assert.equal(storage.get("warmrobot_session"), sessionResult);

  const emptyHome = loadPage("home");
  await emptyHome.onLoad();
  assert.equal(emptyHome.data.adviceStatus, "needs_baby");
  assert.equal(emptyHome.data.weather.temp, 20);
  emptyHome.openProfiles();
  assert.equal(navigations.at(-1), "/pages/profile/index");
  emptyHome.onUnload();

  const profile = loadPage("profile");
  profile.onLoad();
  await profile.onShow();
  profile.addBaby();
  profile.setData({ form: {
    name: "合成测试宝宝", birth_date: "2024-01-01", gender: "female", height_cm: "85", weight_kg: "12",
    warmth_preference: "neutral", wears_diaper: "yes",
  } });
  await profile.saveBaby();
  assert.equal(storage.get("warmrobot_selected_baby"), BABY_ID);
  assert.equal(navigations.at(-1), "/pages/home/index");
  profile.onUnload();

  const readyHome = loadPage("home");
  await readyHome.onLoad();
  assert.equal(readyHome.data.baby.name, "合成测试宝宝");
  assert.equal(readyHome.data.advice.outfitItems[0].label, "长袖上衣");

  const edit = loadPage("profile");
  edit.onLoad();
  await edit.onShow();
  edit.editBaby({ currentTarget: { dataset: { id: BABY_ID } } });
  edit.changeField({ currentTarget: { dataset: { field: "name" } }, detail: { value: "修改后的合成宝宝" } });
  await edit.saveBaby();
  assert.equal(babies.length, 1);
  assert.equal(babies[0].name, "修改后的合成宝宝");
  assert.equal(requests.filter((request) => request.path === "/api/babies" && request.method === "POST").length, 1);
  assert.ok(requests.some((request) => request.path === `/api/babies/${BABY_ID}` && request.method === "PATCH"));

  await readyHome.logout();
  assert.equal(storage.has("warmrobot_session"), false);
  assert.equal(storage.has("warmrobot_selected_baby"), false);
  assert.equal(storage.has("warmrobot_last_weather"), false);
  assert.equal(navigations.at(-1), "/pages/login/index");
});
