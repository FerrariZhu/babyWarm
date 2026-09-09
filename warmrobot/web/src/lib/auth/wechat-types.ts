export type WechatAuthInput = {
  openid: string;
  /** 微信小程序不会提供微信号；仅在用户主动补充时保存。 */
  wechat_id?: string;
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
