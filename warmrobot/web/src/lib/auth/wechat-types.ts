/** Default mock WeChat account for local dev (see /api/auth/wechat/mock). */
export const WECHAT_MOCK_DEFAULTS = {
  openid: "mock_openid_wx_demo_001",
  wechat_id: "demo_wx_parent",
  phone: "13800138000",
  display_name: "微信演示家长",
} as const;

export type WechatAuthInput = {
  openid: string;
  wechat_id: string;
  phone: string;
  display_name?: string;
};

export type WechatAuthUser = {
  userId: string;
  email: string;
};

export function isChinaMobilePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function normalizeWechatId(value: string): string {
  return value.trim();
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, "");
}
