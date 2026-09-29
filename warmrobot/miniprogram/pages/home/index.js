const { authenticatedRequest, clearSession } = require("../../utils/session");

const CACHE_KEY = "warmrobot_last_weather";
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

Page({
  data: { weather: null, loading: false, error: "" },

  onLoad() {
    const cached = wx.getStorageSync(CACHE_KEY);
    if (cached?.result) this.setData({ weather: weatherView(cached.result, "上次获取") });
    if (cached?.result && cached.result.location?.name !== "当前位置"
      && Date.now() - cached.savedAt < FRESH_MS) return;
    if (cached?.source === "手动选择") this.refreshSavedLocation();
    else this.refreshCurrentLocation();
  },

  onPullDownRefresh() {
    const cached = wx.getStorageSync(CACHE_KEY);
    const refresh = cached?.source === "手动选择"
      ? this.refreshSavedLocation()
      : this.refreshCurrentLocation();
    refresh.finally(() => wx.stopPullDownRefresh());
  },

  async refreshSavedLocation() {
    if (this.data.loading) return;
    this.setData({ loading: true, error: "" });
    try {
      const response = await authenticatedRequest("/api/weather");
      if (response.statusCode !== 200 || !response.data?.location) {
        throw new Error(response.data?.error || "天气更新失败");
      }
      this.showWeather(response.data, "手动选择");
    } catch (error) {
      this.setData({ error: errorText(error) });
    } finally {
      this.setData({ loading: false });
    }
  },

  async refreshCurrentLocation() {
    if (this.data.loading) return;
    this.setData({ loading: true, error: "" });
    try {
      const position = await getLocation();
      const city = await resolveDevicePlace(position.latitude, position.longitude);
      const response = await authenticatedRequest("/api/profile/location", "POST", {
        latitude: position.latitude, longitude: position.longitude,
        ...(city ? { city: city.slice(0, 80) } : {}),
      });
      if (response.statusCode !== 200 || !response.data?.location) {
        throw new Error(response.data?.error || "天气获取失败");
      }
      this.showWeather(response.data, "当前位置");
    } catch (error) {
      this.setData({ error: errorText(error) });
    } finally {
      this.setData({ loading: false });
    }
  },

  async selectLocation() {
    if (this.data.loading) return;
    let place;
    try {
      place = await chooseLocation();
    } catch (error) {
      if (!/cancel/i.test(error?.errMsg || "")) this.setData({ error: errorText(error) });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const response = await authenticatedRequest("/api/profile/location", "POST", {
        latitude: place.latitude, longitude: place.longitude,
        city: (place.name || place.address || "已选地点").slice(0, 80),
      });
      if (response.statusCode !== 200 || !response.data?.location) {
        throw new Error(response.data?.error || "地点天气获取失败");
      }
      this.showWeather(response.data, "手动选择");
    } catch (error) {
      this.setData({ error: errorText(error) });
    } finally {
      this.setData({ loading: false });
    }
  },

  showWeather(result, source) {
    wx.setStorageSync(CACHE_KEY, { result, source, savedAt: Date.now() });
    this.setData({ weather: weatherView(result, source), error: "" });
  },

  openSettings() {
    wx.openSetting({ success: ({ authSetting }) => {
      if (authSetting["scope.userLocation"]) this.refreshCurrentLocation();
    } });
  },

  logout() {
    clearSession();
    wx.removeStorageSync(CACHE_KEY);
    wx.reLaunch({ url: "/pages/login/index" });
  },
});
