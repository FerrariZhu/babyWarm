import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../miniprogram/pages/home/index.js", import.meta.url), "utf8");
const BABY_KEY = "warmrobot_selected_baby";
const CACHE_KEY = "warmrobot_last_weather";
const weather = {
  temp: 21, feelsLike: 20, humidity: 60, windSpeed: 2.4,
  text: "晴", observedAt: "2026-10-28T09:00", location: { name: "上海" },
};
const ready = (id = "baby-one") => ({
  status: "ready", baby: { id, name: id === "baby-one" ? "小暖" : "小宝" },
  weather, advice: { current: {
    requiredWarmth: 40,
    outfitItems: [{ id: "cat:tshirt_long", label: "长袖 T 恤", subtitle: "纯棉·透气", pros: "方便活动", alternatives: [{ large: "not for setData" }] }],
    tags: [{ code: "wind", label: "注意挡风", tone: "neutral" }],
    extras: [{ type: "umbrella", reason: "预计有雨", item: { label: "雨伞" } }],
  } },
  conclusion: "按体感灵活增减。", recommendedDate: "2026-10-28",
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function createPage({ handler = async () => ({ statusCode: 200, data: ready() }), locationError, chooseError, logoutResult = { revoked: true } } = {}) {
  const storage = new Map();
  const requests = [];
  const navigations = [];
  const loginNavigations = [];
  let clears = 0;
  let locationCalls = 0;
  let chosenCalls = 0;
  const wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    getLocation: ({ success, fail }) => {
      locationCalls += 1;
      if (locationError) fail(locationError);
      else success({ latitude: 31.2, longitude: 121.5 });
    },
    request: ({ success }) => success({ statusCode: 200, data: { city: "上海" } }),
    chooseLocation: ({ success, fail }) => {
      chosenCalls += 1;
      if (chooseError) fail(chooseError);
      else success({ latitude: 30.2, longitude: 120.1, name: "西湖" });
    },
    stopPullDownRefresh: () => {},
    openSetting: () => {},
    navigateTo: (options) => navigations.push(options),
    reLaunch: (options) => loginNavigations.push(options),
  };
  let definition;
  vm.runInNewContext(source, {
    wx, Page: (value) => { definition = value; }, Date,
    require: () => ({
      authenticatedRequest: async (path, method, body) => {
        requests.push({ path, method, body });
        return handler(path, method, body);
      },
      clearSession: () => { clears += 1; },
      logoutSession: async () => { clears += 1; return logoutResult; },
    }),
  });
  const page = {
    ...definition, data: { ...definition.data },
    setData(patch) { Object.assign(this.data, patch); },
  };
  return { page, storage, requests, navigations, loginNavigations,
    counts: () => ({ clears, locationCalls, chosenCalls }) };
}

function freshCache(storage) {
  storage.set(CACHE_KEY, { result: weather, source: "手动选择", savedAt: Date.now() });
}

test("小程序冷启动使用已有天气加载选中宝宝的完整穿衣建议", async () => {
  const { page, storage, requests, counts } = createPage();
  freshCache(storage);
  storage.set(BABY_KEY, "baby-one");
  await page.onLoad();
  page.onShow();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/api/miniprogram/daily-brief?babyId=baby-one");
  assert.equal(counts().locationCalls, 0);
  assert.equal(page.data.baby.name, "小暖");
  assert.equal(page.data.advice.outfitItems[0].label, "长袖 T 恤");
  assert.equal(page.data.advice.outfitItems[0].pros, "方便活动");
  assert.equal("alternatives" in page.data.advice.outfitItems[0], false);
  assert.equal(page.data.advice.extras[0].label, "雨伞");
  assert.equal(page.data.adviceLoading, false);
  assert.equal(page.data.weather.temp, 21);
});

test("没有宝宝时展示建档状态，不伪造穿衣建议", async () => {
  const { page, storage } = createPage({ handler: async () => ({ statusCode: 200, data: {
    status: "needs_baby", baby: null, advice: null, weather: null,
  } }) });
  freshCache(storage);
  await page.onLoad();
  assert.equal(page.data.adviceStatus, "needs_baby");
  assert.equal(page.data.baby, null);
  assert.equal(page.data.advice, null);
});

test("已删除或失效的宝宝选择只回退一次并保存有效宝宝", async () => {
  const { page, storage, requests } = createPage({ handler: async (path) => path.includes("babyId=")
    ? { statusCode: 404, data: { error: "宝宝不存在" } }
    : { statusCode: 200, data: ready("baby-two") } });
  storage.set(BABY_KEY, "deleted-baby");
  await page.refreshAdvice();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].path, "/api/miniprogram/daily-brief");
  assert.equal(storage.get(BABY_KEY), "baby-two");
  assert.equal(page.data.baby.name, "小宝");
});

test("从档案页返回时重新读取选择，较早响应不能覆盖新宝宝", async () => {
  const pending = deferred();
  const { page, storage, requests } = createPage({ handler: async (path) => path.includes("baby-one")
    ? pending.promise : { statusCode: 200, data: ready("baby-two") } });
  page._initialized = true;
  storage.set(BABY_KEY, "baby-one");
  const earlier = page.refreshAdvice();
  storage.set(BABY_KEY, "baby-two");
  await page.onShow();
  pending.resolve({ statusCode: 200, data: ready("baby-one") });
  await earlier;
  assert.equal(requests.length, 2);
  assert.equal(storage.get(BABY_KEY), "baby-two");
  assert.equal(page.data.baby.name, "小宝");
});

test("退出登录会阻止晚到建议恢复宝宝、天气或本地缓存", async () => {
  const pending = deferred();
  const { page, storage, loginNavigations, counts } = createPage({ handler: async () => pending.promise });
  storage.set(BABY_KEY, "baby-one");
  freshCache(storage);
  const request = page.refreshAdvice();
  await page.logout();
  pending.resolve({ statusCode: 200, data: ready() });
  await request;
  assert.equal(storage.has(BABY_KEY), false);
  assert.equal(storage.has(CACHE_KEY), false);
  assert.equal(page.data.advice, null);
  assert.equal(counts().clears, 1);
  assert.equal(loginNavigations[0].url, "/pages/login/index");
});

test("短暂服务失败可重试，登录失效则返回登录页", async () => {
  let attempt = 0;
  const { page, loginNavigations } = createPage({ handler: async () => {
    attempt += 1;
    if (attempt === 1) return { statusCode: 503, data: { error: "服务暂不可用" } };
    if (attempt === 2) return { statusCode: 200, data: ready() };
    const error = new Error("请先登录"); error.code = "AUTH_REQUIRED"; throw error;
  } });
  await page.refreshAdvice();
  assert.match(page.data.adviceError, /服务暂不可用/);
  assert.equal(page.data.adviceLoading, false);
  await page.refreshAdvice();
  assert.equal(page.data.adviceError, "");
  assert.equal(page.data.adviceStatus, "ready");
  await page.refreshAdvice();
  assert.equal(loginNavigations.length, 1);
  assert.equal(loginNavigations[0].url, "/pages/login/index");
});

test("位置更新后再生成建议，重复点击不会提交第二次定位", async () => {
  const pending = deferred();
  const { page, requests, storage, counts } = createPage({ handler: async (path) => path === "/api/profile/location"
    ? pending.promise : { statusCode: 200, data: ready() } });
  page._initialized = true;
  const first = page.refreshCurrentLocation();
  await page.refreshCurrentLocation();
  assert.equal(counts().locationCalls, 1);
  pending.resolve({ statusCode: 200, data: weather });
  await first;
  assert.equal(requests[0].path, "/api/profile/location");
  assert.equal(requests[1].path, "/api/miniprogram/daily-brief");
  assert.equal(storage.get(BABY_KEY), "baby-one");
  assert.equal(page.data.adviceStatus, "ready");
  assert.equal(page.data.loading, false);
});

test("手动选点取消后不提交地点，仍可继续使用已有地点建议", async () => {
  const { page, requests, storage } = createPage({ chooseError: { errMsg: "chooseLocation:fail cancel" } });
  page._initialized = true;
  freshCache(storage);
  await page.selectLocation();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/api/miniprogram/daily-brief");
  assert.equal(page.data.error, "");
  assert.equal(page.data.loading, false);
});

test("档案入口防止重复导航，返回后可以再次打开", async () => {
  const { page, navigations } = createPage();
  page.openProfiles(); page.openProfiles();
  assert.equal(navigations.length, 1);
  assert.equal(navigations[0].url, "/pages/profile/index");
  page.onShow();
  page.openProfiles();
  assert.equal(navigations.length, 2);
});

test("页面卸载后晚到的天气响应不写入缓存或触发建议请求", async () => {
  const pending = deferred();
  const { page, requests, storage } = createPage({ handler: async () => pending.promise });
  page._initialized = true;
  const request = page.refreshSavedLocation();
  page.onUnload();
  pending.resolve({ statusCode: 200, data: weather });
  await request;
  assert.equal(requests.length, 1);
  assert.equal(storage.has(CACHE_KEY), false);
  assert.equal(page.data.weather, null);
});


test("定位拒绝后已有地点建议仍可显示，同时保留权限提示", async () => {
  const { page, requests } = createPage({ locationError: { errMsg: "getLocation:fail auth deny" } });
  page._initialized = true;
  await page.refreshCurrentLocation();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/api/miniprogram/daily-brief");
  assert.equal(page.data.adviceStatus, "ready");
  assert.match(page.data.error, /未获得定位权限/);
});


test("服务器撤销未确认时退出仍清理本机并显示明确提示", async () => {
  const { page, storage, loginNavigations, counts } = createPage({ logoutResult: { revoked: false } });
  storage.set(BABY_KEY, "baby-one");
  freshCache(storage);
  await page.logout();
  await page.logout();
  assert.equal(counts().clears, 1);
  assert.equal(storage.has(BABY_KEY), false);
  assert.equal(storage.has(CACHE_KEY), false);
  assert.equal(loginNavigations[0].url, "/pages/login/index?logout=local");
});
