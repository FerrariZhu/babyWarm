const { authenticatedRequest, clearSession } = require("../../utils/session");
Page({
  data: { message: "登录成功", error: "" },
  async onLoad() {
    try { await authenticatedRequest("/api/weather"); } catch (error) { this.setData({ error: error.message }); }
  },
  logout() { clearSession(); wx.reLaunch({ url: "/pages/login/index" }); },
});
