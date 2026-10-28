const { API_BASE } = require("../config");
const SESSION_KEY = "warmrobot_session";
let sessionEpoch = 0;
let loginEpoch = 0;
let refreshFlight = null;
let logoutFlight = null;

function isLoggingOut() { return logoutFlight?.loginEpoch === loginEpoch; }

function readSession() { return wx.getStorageSync(SESSION_KEY) || null; }
function saveSession(session) {
  sessionEpoch += 1;
  loginEpoch += 1;
  wx.setStorageSync(SESSION_KEY, session);
}
function clearSession() {
  sessionEpoch += 1;
  wx.removeStorageSync(SESSION_KEY);
}
function authRequired() {
  const error = new Error("登录已过期，请重新登录");
  error.code = "AUTH_REQUIRED";
  return error;
}
function isUsableSession(session) {
  return typeof session?.access_token === "string" && session.access_token.length > 0
    && typeof session?.refresh_token === "string" && session.refresh_token.length > 0;
}

function request(path, method, data, token, timeout = 15000) {
  return new Promise((resolve, reject) => wx.request({
    url: `${API_BASE}${path}`,
    method,
    data,
    timeout,
    header: token ? { Authorization: `Bearer ${token}` } : {},
    success: resolve,
    fail: reject,
  }));
}

function refreshSession() {
  const current = readSession();
  if (!current?.refresh_token) return Promise.resolve(null);
  const epoch = sessionEpoch;
  if (refreshFlight?.epoch === epoch && refreshFlight.token === current.refresh_token) {
    return refreshFlight.promise;
  }
  const flight = { epoch, token: current.refresh_token };
  flight.promise = (async () => {
    const response = await request("/api/auth/wechat/refresh", "POST", { refresh_token: current.refresh_token });
    // An older request must never restore a logged-out session or overwrite a new login.
    if (sessionEpoch !== epoch || readSession()?.refresh_token !== current.refresh_token) return null;
    if (response.statusCode === 400 || response.statusCode === 401) {
      clearSession();
      return null;
    }
    if (response.statusCode !== 200 || !isUsableSession(response.data?.session)) {
      // A service outage is not evidence that the stored credentials were revoked.
      throw new Error("登录服务暂时不可用，请稍后重试");
    }
    wx.setStorageSync(SESSION_KEY, response.data.session);
    return response.data.session;
  })().finally(() => {
    if (refreshFlight === flight) refreshFlight = null;
  });
  refreshFlight = flight;
  return flight.promise;
}

async function ensureSession() {
  if (isLoggingOut()) return null;
  const session = readSession();
  if (!isUsableSession(session)) return null;
  if (!Number.isFinite(session.expires_at) || session.expires_at * 1000 < Date.now() + 60_000) {
    return refreshSession();
  }
  return session;
}

async function authenticatedRequest(path, method = "GET", data) {
  const epoch = sessionEpoch;
  let session = await ensureSession();
  if (!session || epoch !== sessionEpoch || isLoggingOut()) throw authRequired();
  let response = await request(path, method, data, session.access_token);
  if (epoch !== sessionEpoch || isLoggingOut()) throw authRequired();
  if (response.statusCode === 401) {
    // Another in-flight request may already have rotated this access token.
    const latest = readSession();
    session = latest?.access_token !== session.access_token ? latest : await refreshSession();
    if (!session || epoch !== sessionEpoch || isLoggingOut()) throw authRequired();
    response = await request(path, method, data, session.access_token);
    if (epoch !== sessionEpoch || isLoggingOut()) throw authRequired();
    if (response.statusCode === 401) {
      clearSession();
      throw authRequired();
    }
  }
  return response;
}

function logoutSession() {
  if (isLoggingOut()) return logoutFlight.promise;
  const flight = { epoch: sessionEpoch, loginEpoch };
  const initialSession = readSession();
  const pendingRefresh = refreshFlight?.epoch === sessionEpoch ? refreshFlight.promise : null;
  logoutFlight = flight;
  flight.promise = (async () => {
    let refreshUncertain = false;
    try {
      // Capture the replacement pair if an already-started rotation succeeds.
      // New protected requests are blocked while this best-effort logout runs.
      if (pendingRefresh) {
        try { await pendingRefresh; } catch { refreshUncertain = true; }
      }
      if (loginEpoch !== flight.loginEpoch) return { revoked: false, superseded: true };
      const current = readSession() || initialSession;
      if (!isUsableSession(current)) return { revoked: false, noSession: true };
      const response = await request("/api/auth/wechat/logout", "POST",
        { refresh_token: current.refresh_token }, current.access_token, 5000);
      return {
        revoked: !refreshUncertain && response.statusCode === 200 && response.data?.revoked === true,
        superseded: loginEpoch !== flight.loginEpoch,
      };
    } catch {
      return { revoked: false, superseded: loginEpoch !== flight.loginEpoch };
    } finally {
      // Always forget this local login, but never erase a newer account login.
      if (loginEpoch === flight.loginEpoch) clearSession();
      if (logoutFlight === flight) logoutFlight = null;
    }
  })();
  return flight.promise;
}

module.exports = { authenticatedRequest, clearSession, ensureSession, logoutSession, readSession, saveSession };
