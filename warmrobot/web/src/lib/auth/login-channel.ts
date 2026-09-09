export const LOGIN_CHANNELS = [
  "email_password",
  "wechat_miniprogram",
  "xiaohongshu",
  "douyin",
] as const;

export type LoginChannel = (typeof LOGIN_CHANNELS)[number];

const LOGIN_CHANNEL_LABELS: Record<LoginChannel, string> = {
  email_password: "邮箱密码",
  wechat_miniprogram: "微信小程序",
  xiaohongshu: "小红书",
  douyin: "抖音",
};

export function normalizeLoginChannel(value: unknown): LoginChannel | null {
  return typeof value === "string" && LOGIN_CHANNELS.includes(value as LoginChannel)
    ? (value as LoginChannel)
    : null;
}

export function getLoginChannelLabel(channel: LoginChannel): string {
  return LOGIN_CHANNEL_LABELS[channel];
}
