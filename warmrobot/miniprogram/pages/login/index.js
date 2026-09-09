const { API_BASE } = require("../../config");
const { saveSession } = require("../../utils/session");

Page({
  data: { loading: false, error: "" },
  async onGetPhoneNumber(event) {
    const phoneCode = event.detail?.code;
    if (!phoneCode) {
      this.setData({ error: "需要授权手机号才能关联你的暖宝宝数据。" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const login = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
      if (!login.code) throw new Error("微信登录凭证获取失败");
      const response = await new Promise((resolve, reject) => wx.request({
        url: `${API_BASE}/api/auth/wechat/login`, method: "POST",
        data: { code: login.code, phone_code: phoneCode }, success: resolve, fail: reject,
      }));
      if (response.statusCode !== 200 || !response.data?.session) throw new Error(response.data?.error || "登录失败");
      saveSession(response.data.session);
      wx.reLaunch({ url: "/pages/home/index" });
    } catch (error) {
      this.setData({ error: error.message || "网络异常，请重试" });
    } finally { this.setData({ loading: false }); }
  },
});
