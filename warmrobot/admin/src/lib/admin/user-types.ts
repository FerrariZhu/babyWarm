/** C 端注册渠道；后续可扩展 h5 等 */
export const USER_SIGNUP_CHANNELS = ["miniprogram"] as const;
export type UserSignupChannel = (typeof USER_SIGNUP_CHANNELS)[number];

export type AdminUserSource = UserSignupChannel | "manual";

const SIGNUP_CHANNEL_LABELS: Record<UserSignupChannel, string> = {
  miniprogram: "小程序",
};

export function isAppSignupSource(source: AdminUserSource): source is UserSignupChannel {
  return source !== "manual";
}

export type AdminBabyRecord = {
  id: string;
  name: string;
  birth_date: string;
  gender: string | null;
  activity_level: string;
  height_cm: number | null;
  weight_kg: number | null;
  is_active: boolean;
  notes: string | null;
  warmth_preference: string | null;
  warmth_offset: number | null;
  created_at: string;
  fromApp: boolean;
};

export type AdminUserRecord = {
  id: string;
  source: AdminUserSource;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  wechat_id: string | null;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  babies: AdminBabyRecord[];
};

export type AdminDressingRecord = {
  id: string;
  babyId: string;
  babyName: string;
  recordedDate: string;
  savedAt: string;
  requiredWarmth: number;
  reason: string;
  locationLabel: string | null;
  conditionText: string | null;
  temp: number | null;
  indoorSummary: string;
  outdoorSummary: string;
  extrasSummary: string;
};

export type SaveAppUserInput = {
  id: string;
  display_name?: string | null;
  wechat_id?: string | null;
  wechat_openid?: string | null;
  wechat_unionid?: string | null;
  city?: string | null;
  admin_notes?: string | null;
};

export type SaveManualUserInput = {
  parent_name: string;
  wechat_id?: string | null;
  email?: string | null;
  city?: string | null;
  admin_notes?: string | null;
  baby_name?: string | null;
  baby_birth_date?: string | null;
  baby_gender?: string | null;
  baby_height_cm?: number | null;
  baby_weight_kg?: number | null;
  baby_warmth_preference?: string | null;
};

export type UpdateManualUserInput = SaveManualUserInput & { id: string };

const GENDER_LABELS: Record<string, string> = {
  male: "男孩",
  female: "女孩",
  unknown: "未知",
};

const ACTIVITY_LABELS: Record<string, string> = {
  low: "低（抱/推车）",
  medium: "中（爬）",
  high: "高（走/跑）",
};

const WARMTH_LABELS: Record<string, string> = {
  runs_cold: "怕冷",
  slightly_cold: "偏怕冷",
  neutral: "正常",
  slightly_hot: "偏怕热",
  runs_hot: "怕热",
};

export const WARMTH_PREFERENCE_OPTIONS = [
  { value: "runs_cold", label: "怕冷" },
  { value: "slightly_cold", label: "偏怕冷" },
  { value: "neutral", label: "正常" },
  { value: "slightly_hot", label: "偏怕热" },
  { value: "runs_hot", label: "怕热" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "男孩" },
  { value: "female", label: "女孩" },
  { value: "unknown", label: "未知" },
] as const;

export function genderLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return GENDER_LABELS[value] ?? value;
}

export function activityLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ACTIVITY_LABELS[value] ?? value;
}

export function warmthPreferenceLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return WARMTH_LABELS[value] ?? value;
}

export function formatCoord(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number(value).toFixed(4);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatRecordedDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

export function sourceLabel(source: AdminUserSource): string {
  if (source === "manual") return "手动录入";
  return SIGNUP_CHANNEL_LABELS[source] ?? source;
}
