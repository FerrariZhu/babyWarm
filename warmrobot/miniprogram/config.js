// The desktop simulator can call the local Next.js API while the public domain is pending.
// Real devices continue to use the HTTPS domain registered in the Mini Program backend.
const isDevtools = typeof wx !== "undefined"
  && typeof wx.getSystemInfoSync === "function"
  && wx.getSystemInfoSync().platform === "devtools";

module.exports = {
  API_BASE: isDevtools ? "http://127.0.0.1:3000" : "https://warmbaby.top",
};
