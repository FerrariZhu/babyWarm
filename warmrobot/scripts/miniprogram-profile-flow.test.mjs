import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../miniprogram/pages/profile/index.js", import.meta.url), "utf8");
const sampleBaby = {
  id: "baby-1", name: "小暖", birth_date: "2024-05-20", gender: "female",
  height_cm: 88, weight_kg: 12.5, wears_diaper: true, warmth_preference: "neutral",
};
const validForm = {
  name: "  小暖  ", birth_date: "2024-05-20", gender: "female", height_cm: "88",
  weight_kg: "12.5", warmth_preference: "neutral", wears_diaper: "yes",
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

function createPage({ handler, options, selectedId } = {}) {
  const storage = new Map(selectedId ? [["warmrobot_selected_baby", selectedId]] : []);
  const requests = [];
  const navigation = [];
  let definition;
  vm.runInNewContext(source, {
    Page: (value) => { definition = value; },
    require: () => ({
      authenticatedRequest: async (path, method = "GET", body) => {
        requests.push({ path, method, body });
        if (handler) return handler(path, method, body);
        return method === "GET"
          ? { statusCode: 200, data: { babies: [sampleBaby] } }
          : { statusCode: 200, data: sampleBaby };
      },
    }),
    wx: {
      getStorageSync: (key) => storage.get(key),
      setStorageSync: (key, value) => storage.set(key, value),
      removeStorageSync: (key) => storage.delete(key),
      reLaunch: ({ url }) => navigation.push(url),
    },
    Date,
  });
  const page = {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch) { Object.assign(this.data, patch); },
  };
  page.onLoad(options);
  return { page, requests, storage, navigation };
}

function event(id) { return { currentTarget: { dataset: { id } } }; }

test("宝宝档案列表只使用认证 API，保留当前选中的宝宝", async () => {
  const { page, requests, storage } = createPage({ selectedId: sampleBaby.id });
  await page.onShow();
  assert.equal(requests[0].path, "/api/babies");
  assert.equal(requests[0].method, "GET");
  assert.equal(page.data.babies[0].genderLabel, "女孩");
  assert.equal(page.data.selectedId, sampleBaby.id);
  assert.equal(storage.get("warmrobot_selected_baby"), sampleBaby.id);
  assert.equal(page.data.loading, false);
});

test("添加宝宝表单提交服务端契约并在成功后打开穿衣建议", async () => {
  const { page, requests, storage, navigation } = createPage({ options: { mode: "add" } });
  assert.equal(page.data.mode, "form");
  page.setData({ form: { ...validForm } });
  await page.saveBaby();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].body.name, "小暖");
  assert.equal(requests[0].body.height_cm, 88);
  assert.equal(requests[0].body.weight_kg, 12.5);
  assert.equal(requests[0].body.wears_diaper, "yes");
  assert.equal(storage.get("warmrobot_selected_baby"), sampleBaby.id);
  assert.deepEqual(navigation, ["/pages/home/index"]);
});

test("编辑已有档案使用 PATCH，保留尿布和温度偏好", async () => {
  const { page, requests } = createPage({
    handler: (path, method) => method === "GET"
      ? { statusCode: 200, data: { babies: [{ ...sampleBaby, wears_diaper: false, warmth_preference: "runs_hot" }] } }
      : { statusCode: 200, data: sampleBaby },
  });
  await page.onShow();
  page.editBaby(event(sampleBaby.id));
  assert.equal(page.data.form.wears_diaper, "no");
  assert.equal(page.data.form.warmth_preference, "runs_hot");
  await page.saveBaby();
  assert.equal(requests[1].path, "/api/babies/baby-1");
  assert.equal(requests[1].method, "PATCH");
  assert.equal(requests[1].body.wears_diaper, "no");
});

test("生日、身高、体重或尿布状态无效时不会发送创建请求", async () => {
  for (const patch of [
    { birth_date: "2099-01-01" }, { birth_date: "2024-02-30" }, { birth_date: "" },
    { height_cm: "0" }, { height_cm: "NaN" }, { weight_kg: "-1" },
    { wears_diaper: "" }, { name: "  " }, { gender: "" },
  ]) {
    const { page, requests } = createPage();
    page.setData({ form: { ...validForm, ...patch } });
    await page.saveBaby();
    assert.equal(requests.length, 0, JSON.stringify(patch));
    assert.ok(page.data.error);
  }
});

test("重复点击保存只会创建一次，保存期间不能更改或取消表单", async () => {
  const pending = deferred();
  const { page, requests, navigation } = createPage({ handler: () => pending.promise, options: { mode: "add" } });
  page.setData({ form: { ...validForm } });
  const first = page.saveBaby();
  await page.saveBaby();
  page.cancelForm();
  page.changeField({ currentTarget: { dataset: { field: "name" } }, detail: { value: "新名字" } });
  assert.equal(requests.length, 1);
  assert.equal(page.data.mode, "form");
  assert.equal(page.data.form.name, validForm.name);
  pending.resolve({ statusCode: 200, data: sampleBaby });
  await first;
  assert.deepEqual(navigation, ["/pages/home/index"]);
});

test("保存成功但页面尚未跳转时再次点击不会重复创建宝宝", async () => {
  const { page, requests, navigation } = createPage({ options: { mode: "add" } });
  page.setData({ form: { ...validForm } });
  await page.saveBaby();
  await page.saveBaby();
  assert.equal(requests.length, 1);
  assert.equal(page.data.editingId, sampleBaby.id);
  assert.equal(navigation.length, 2);
  page.changeField({ currentTarget: { dataset: { field: "name" } }, detail: { value: "小暖暖" } });
  await page.saveBaby();
  assert.equal(requests[1].method, "PATCH");
  assert.equal(requests[1].path, "/api/babies/baby-1");
});

test("离开档案页后，晚到的保存结果不会导航或改变选择", async () => {
  const pending = deferred();
  const { page, navigation, storage } = createPage({ handler: () => pending.promise });
  page.setData({ form: { ...validForm } });
  const save = page.saveBaby();
  page.onUnload();
  pending.resolve({ statusCode: 200, data: sampleBaby });
  await save;
  assert.deepEqual(navigation, []);
  assert.equal(storage.has("warmrobot_selected_baby"), false);
});

test("离开档案页后，晚到的列表请求不会修改页面或重新登录", async () => {
  const pending = deferred();
  const { page, navigation } = createPage({ handler: () => pending.promise });
  const loading = page.onShow();
  page.onUnload();
  pending.reject(Object.assign(new Error("请先登录"), { code: "AUTH_REQUIRED" }));
  await loading;
  assert.equal(page.data.babies.length, 0);
  assert.deepEqual(navigation, []);
});

test("登录失效返回登录页，普通保存失败保留填写内容供重试", async () => {
  const expired = createPage({ handler: () => { throw Object.assign(new Error("请先登录"), { code: "AUTH_REQUIRED" }); } });
  await expired.page.onShow();
  assert.deepEqual(expired.navigation, ["/pages/login/index"]);

  const failure = createPage({ handler: () => ({ statusCode: 503, data: { error: "服务暂时不可用" } }) });
  failure.page.setData({ form: { ...validForm } });
  await failure.page.saveBaby();
  assert.equal(failure.page.data.form.name, validForm.name);
  assert.equal(failure.page.data.saving, false);
  assert.equal(failure.page.data.error, "服务暂时不可用");
  assert.deepEqual(failure.navigation, []);
});

test("切换宝宝后返回首页，取消新增表单不会写入数据", async () => {
  const { page, requests, navigation, storage } = createPage();
  await page.onShow();
  page.addBaby();
  page.cancelForm();
  assert.equal(page.data.mode, "list");
  assert.equal(requests.length, 1);
  page.selectBaby(event("other-users-baby"));
  assert.deepEqual(navigation, []);
  page.selectBaby(event(sampleBaby.id));
  assert.equal(storage.get("warmrobot_selected_baby"), sampleBaby.id);
  assert.deepEqual(navigation, ["/pages/home/index"]);
});

test("没有宝宝时清除过期选择并显示空列表", async () => {
  const { page, storage } = createPage({
    selectedId: "removed-baby",
    handler: () => ({ statusCode: 200, data: { babies: [] } }),
  });
  await page.onShow();
  assert.equal(page.data.babies.length, 0);
  assert.equal(page.data.selectedId, "");
  assert.equal(storage.has("warmrobot_selected_baby"), false);
});
