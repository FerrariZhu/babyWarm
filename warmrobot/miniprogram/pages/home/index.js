const { authenticatedRequest, clearSession, logoutSession } = require("../../utils/session");

const CACHE_KEY = "warmrobot_last_weather";
const BABY_KEY = "warmrobot_selected_baby";
const FRESH_MS = 30 * 60 * 1000;
const REVERSE_URL = "https://api-bdc.net/data/reverse-geocode-client";

function getLocation() {
  return new Promise((resolve, reject) => wx.getLocation({
    type: "wgs84", success: resolve, fail: reject,
  }));
}

function chooseLocation() {
  return new Promise((resolve, reject) => wx.chooseLocation({
    success: resolve, fail: reject,
  }));
}

function formatDevicePlace(data) {
  if (!data || typeof data !== "object") return null;
  const administrative = (data.localityInfo?.administrative || [])
    .filter((part) => part.name?.trim() && part.name.trim() !== data.countryName?.trim())
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((part) => part.name.trim());
  const names = administrative.length
    ? administrative.slice(-3)
    : [data.principalSubdivision, data.city, data.locality];
  return [...new Set(names.map((name) => name?.trim()).filter(Boolean))].join("") || null;
}

function resolveDevicePlace(latitude, longitude) {
  const url = `${REVERSE_URL}?latitude=${encodeURIComponent(latitude)}`
    + `&longitude=${encodeURIComponent(longitude)}&localityLanguage=zh`;
  return new Promise((resolve) => wx.request({
    url,
    timeout: 3000,
    success: ({ statusCode, data }) => resolve(statusCode === 200 ? formatDevicePlace(data) : null),
    fail: () => resolve(null),
  }));
}

function weatherView(result, source) {
  const observed = result.observedAt || result.fetchedAt || "";
  return {
    location: result.location?.name && result.location.name !== "当前位置"
      ? result.location.name : "选择具体地点",
    temp: Number.isFinite(result.temp) ? Math.round(result.temp) : "--",
    feelsLike: Number.isFinite(result.feelsLike) ? Math.round(result.feelsLike) : "--",
    humidity: Number.isFinite(result.humidity) ? Math.round(result.humidity) : "--",
    windSpeed: Number.isFinite(result.windSpeed) ? result.windSpeed.toFixed(1) : "--",
    precipProbability: Number.isFinite(result.precipProbability) ? Math.round(result.precipProbability) : "--",
    uvIndex: Number.isFinite(result.uvIndex) ? result.uvIndex.toFixed(1) : "--",
    text: result.text || "天气未知",
    observedAt: observed ? observed.replace("T", " ").slice(0, 16) : "",
    source,
  };
}

function errorText(error) {
  const message = error?.errMsg || error?.message || "";
  if (/auth deny|authorize|permission|privacy|拒绝|未授权/i.test(message)) {
    return "未获得定位权限。可在小程序设置中开启定位，或手动选择地点。";
  }
  if (/timeout|超时/i.test(message)) return "定位超时，请重试或手动选择地点。";
  return message || "暂时无法获取当地天气，请重试或手动选择地点。";
}

function responseError(response, fallback) {
  const error = new Error(response.data?.error || fallback);
  if (response.statusCode === 401) error.code = "AUTH_REQUIRED";
  return error;
}

function adviceView(advice) {
  const current = advice?.current;
  if (!current || !Array.isArray(current.outfitItems)) return null;
  return {
    requiredWarmth: current.requiredWarmth,
    outfitItems: current.outfitItems.map((item, index) => ({
      key: `${item.id}:${index}`, label: item.label, subtitle: item.subtitle || "",
      pros: item.pros || "", cons: item.cons || "",
      warmthValue: Number.isFinite(item.warmthValue) ? item.warmthValue : null,
    })),
    tags: (current.tags || []).map((tag) => ({ code: tag.code, label: tag.label })),
    extras: (current.extras || []).map((extra, index) => ({
      key: `${extra.type}:${index}`, label: extra.item?.label || (extra.type === "umbrella" ? "雨伞" : "出门提醒"),
      reason: extra.reason || "",
    })),
  };
}

Page({
  data: {
    weather: null, loading: false, loggingOut: false, error: "", baby: null,
    advice: null, adviceStatus: "loading", adviceLoading: false, adviceError: "",
    conclusion: "", recommendedDate: "", dressingMethod: null,
  },

  onLoad() {
    this._initialized = true;
    this._disposed = false;
    this._skipNextShow = true;
    const cached = wx.getStorageSync(CACHE_KEY);
    if (cached?.result) this.setData({ weather: weatherView(cached.result, "上次获取") });
    if (cached?.result && cached.result.location?.name !== "当前位置"
      && Date.now() - cached.savedAt < FRESH_MS) return this.refreshAdvice();
    if (cached?.source === "手动选择") return this.refreshSavedLocation();
    return this.refreshCurrentLocation();
  },

  onShow() {
    this._navigating = false;
    if (this._skipNextShow) { this._skipNextShow = false; return; }
    if (this._initialized && !this._disposed && !this.data.loading) return this.refreshAdvice();
  },

  onUnload() {
    this._disposed = true;
    this._weatherRun = (this._weatherRun || 0) + 1;
    this._adviceRun = (this._adviceRun || 0) + 1;
  },

  onPullDownRefresh() {
    const cached = wx.getStorageSync(CACHE_KEY);
    const refresh = cached?.source === "手动选择"
      ? this.refreshSavedLocation()
      : this.refreshCurrentLocation();
    refresh.finally(() => wx.stopPullDownRefresh());
  },

  beginWeather() {
    if (this.data.loading || this._disposed) return null;
    const run = this._weatherRun = (this._weatherRun || 0) + 1;
    this._adviceRun = (this._adviceRun || 0) + 1;
    this.setData({ loading: true, error: "", advice: null, adviceError: "", adviceLoading: false });
    return run;
  },

  weatherIsCurrent(run) { return !this._disposed && this._weatherRun === run; },

  handleFailure(error, field) {
    if (this._disposed) return;
    if (error?.code === "AUTH_REQUIRED") {
      this.onUnload();
      clearSession();
      wx.removeStorageSync(CACHE_KEY);
      wx.removeStorageSync(BABY_KEY);
      wx.reLaunch({ url: "/pages/login/index" });
      return;
    }
    this.setData({ [field]: errorText(error) });
  },

  async finishWeather(run) {
    if (!this.weatherIsCurrent(run)) return;
    this.setData({ loading: false });
    if (this._initialized) await this.refreshAdvice();
  },

  async refreshSavedLocation() {
    const run = this.beginWeather();
    if (run === null) return;
    try {
      const response = await authenticatedRequest("/api/weather");
      if (!this.weatherIsCurrent(run)) return;
      if (response.statusCode !== 200 || !response.data?.location) {
        throw responseError(response, "天气更新失败");
      }
      this.showWeather(response.data, "手动选择");
    } catch (error) {
      if (this.weatherIsCurrent(run)) this.handleFailure(error, "error");
    } finally { await this.finishWeather(run); }
  },

  async refreshCurrentLocation() {
    const run = this.beginWeather();
    if (run === null) return;
    try {
      const position = await getLocation();
      if (!this.weatherIsCurrent(run)) return;
      const city = await resolveDevicePlace(position.latitude, position.longitude);
      if (!this.weatherIsCurrent(run)) return;
      const response = await authenticatedRequest("/api/profile/location", "POST", {
        latitude: position.latitude, longitude: position.longitude,
        ...(city ? { city: city.slice(0, 80) } : {}),
      });
      if (!this.weatherIsCurrent(run)) return;
      if (response.statusCode !== 200 || !response.data?.location) {
        throw responseError(response, "天气获取失败");
      }
      this.showWeather(response.data, "当前位置");
    } catch (error) {
      if (this.weatherIsCurrent(run)) this.handleFailure(error, "error");
    } finally { await this.finishWeather(run); }
  },

  async selectLocation() {
    const run = this.beginWeather();
    if (run === null) return;
    let selected = false;
    try {
      const place = await chooseLocation();
      if (!this.weatherIsCurrent(run)) return;
      selected = true;
      const response = await authenticatedRequest("/api/profile/location", "POST", {
        latitude: place.latitude, longitude: place.longitude,
        city: (place.name || place.address || "已选地点").slice(0, 80),
      });
      if (!this.weatherIsCurrent(run)) return;
      if (response.statusCode !== 200 || !response.data?.location) {
        throw responseError(response, "地点天气获取失败");
      }
      this.showWeather(response.data, "手动选择");
    } catch (error) {
      if (this.weatherIsCurrent(run) && (selected || !/cancel/i.test(error?.errMsg || ""))) {
        this.handleFailure(error, "error");
      }
    } finally { await this.finishWeather(run); }
  },

  showWeather(result, source) {
    if (this._disposed) return;
    wx.setStorageSync(CACHE_KEY, { result, source, savedAt: Date.now() });
    this.setData({ weather: weatherView(result, source), error: "" });
  },

  async refreshAdvice() {
    if (this._disposed) return;
    const run = this._adviceRun = (this._adviceRun || 0) + 1;
    let selected = wx.getStorageSync(BABY_KEY);
    const current = () => !this._disposed && this._adviceRun === run
      && wx.getStorageSync(BABY_KEY) === selected;
    this.setData({ adviceLoading: true, adviceError: "", advice: null, conclusion: "", dressingMethod: null });
    try {
      const path = "/api/miniprogram/daily-brief";
      let response = await authenticatedRequest(typeof selected === "string" && selected
        ? `${path}?babyId=${encodeURIComponent(selected)}` : path);
      if (!current()) return;
      if (selected && (response.statusCode === 404 || response.statusCode === 400)) {
        wx.removeStorageSync(BABY_KEY);
        selected = wx.getStorageSync(BABY_KEY);
        response = await authenticatedRequest(path);
        if (!current()) return;
      }
      if (response.statusCode !== 200 || !response.data?.status) {
        throw responseError(response, "穿衣建议加载失败，请重试");
      }
      const result = response.data;
      if (result.baby?.id) wx.setStorageSync(BABY_KEY, result.baby.id);
      else wx.removeStorageSync(BABY_KEY);
      selected = wx.getStorageSync(BABY_KEY);
      const baby = result.baby ? { id: result.baby.id, name: result.baby.name } : null;
      this.setData({
        baby, adviceStatus: result.status, advice: adviceView(result.advice),
        conclusion: result.conclusion || "", recommendedDate: result.recommendedDate || "",
        dressingMethod: result.dressingMethod || null,
      });
      if (result.weather?.location) {
        const cached = wx.getStorageSync(CACHE_KEY);
        const weatherError = this.data.error;
        this.showWeather(result.weather, cached?.source || "已保存地点");
        if (weatherError) this.setData({ error: weatherError });
      }
    } catch (error) {
      if (current()) this.handleFailure(error, "adviceError");
    } finally {
      if (current()) this.setData({ adviceLoading: false });
    }
  },

  openProfiles() {
    if (this._navigating || this._disposed) return;
    this._navigating = true;
    wx.navigateTo({ url: "/pages/profile/index", fail: () => { this._navigating = false; } });
  },

  openSettings() {
    wx.openSetting({ success: ({ authSetting }) => {
      if (!this._disposed && authSetting["scope.userLocation"]) this.refreshCurrentLocation();
    } });
  },

  async logout() {
    if (this.data.loggingOut || this._disposed) return;
    this.setData({ loggingOut: true });
    this.onUnload();
    wx.removeStorageSync(CACHE_KEY);
    wx.removeStorageSync(BABY_KEY);
    const result = await logoutSession();
    if (result.superseded) return;
    wx.reLaunch({ url: result.revoked || result.noSession
      ? "/pages/login/index" : "/pages/login/index?logout=local" });
  },
});
