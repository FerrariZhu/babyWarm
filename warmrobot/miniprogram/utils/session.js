const { API_BASE } = require("../config");
const SESSION_KEY = "warmrobot_session";

function readSession() { return wx.getStorageSync(SESSION_KEY) || null; }
function saveSession(session) { wx.setStorageSync(SESSION_KEY, session); }
function clearSession() { wx.removeStorageSync(SESSION_KEY); }

function request(path, method, data, token) {
  return new Promise((resolve, reject) => wx.request({
    url: `${API_BASE}${path}`,
    method,
    data,
    header: token ? { Authorization: `Bearer ${token}` } : {},
    success: resolve,
    fail: reject,
  }));
}

async function refreshSession() {
  const current = readSession();
  if (!current?.refresh_token) return null;
  const response = await request("/api/auth/wechat/refresh", "POST", { refresh_token: current.refresh_token });
  if (response.statusCode !== 200 || !response.data?.session) { clearSession(); return null; }
  saveSession(response.data.session);
  return response.data.session;
}

async function authenticatedRequest(path, method = "GET", data) {
  let session = readSession();
  if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000)) session = await refreshSession();
  if (!session) throw new Error("请先登录");
  let response = await request(path, method, data, session.access_token);
  if (response.statusCode === 401 && (session = await refreshSession())) {
    response = await request(path, method, data, session.access_token);
  }
  return response;
}

module.exports = { authenticatedRequest, clearSession, readSession, saveSession };
