const { API_BASE } = require("../../config");
const { ensureSession, saveSession } = require("../../utils/session");

Page({
  data: { loading: false, error: "", notice: "" },
  async onLoad(options = {}) {
    this._unloaded = false;
    this.setData({ loading: true, error: "", notice: options.logout === "local"
      ? "已清除本机登录，但服务器会话撤销未确认。网络恢复后请重新登录。" : "" });
    try {
      const session = await ensureSession();
      if (!this._unloaded && session) wx.reLaunch({ url: "/pages/home/index" });
    } catch (error) {
      if (!this._unloaded) this.setData({ error: error.message || "暂时无法恢复登录，请检查网络后重试。" });
    } finally {
      if (!this._unloaded) this.setData({ loading: false });
    }
  },
  onUnload() { this._unloaded = true; },
  async onGetPhoneNumber(event) {
    if (this.data.loading || this._unloaded) return;
    const phoneCode = event.detail?.code;
    if (!phoneCode) {
      this.setData({ error: "需要授权手机号才能关联你的暖宝宝数据。" });
      return;
    }
    this.setData({ loading: true, error: "", notice: "" });
    try {
      const login = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
      if (!login.code) throw new Error("微信登录凭证获取失败");
      const response = await new Promise((resolve, reject) => wx.request({
        url: `${API_BASE}/api/auth/wechat/login`, method: "POST", timeout: 15000,
        data: { code: login.code, phone_code: phoneCode }, success: resolve, fail: reject,
      }));
      if (this._unloaded) return;
      if (response.statusCode !== 200 || !response.data?.session) throw new Error(response.data?.error || "登录失败");
      saveSession(response.data.session);
      wx.reLaunch({ url: "/pages/home/index" });
    } catch (error) {
      if (this._unloaded) return;
      const requestFailed = typeof error?.errMsg === "string" && error.errMsg.startsWith("request:fail");
      this.setData({
        error: requestFailed
          ? "无法连接登录服务，请检查网络及小程序的 request 合法域名。"
          : error.message || "网络异常，请重试",
      });
    } finally { if (!this._unloaded) this.setData({ loading: false }); }
  },
});
