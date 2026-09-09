export type BabyGender = "male" | "female";

export type WearsDiaperChoice = "yes" | "no";

export type WarmthPreference =
  | "runs_cold"
  | "slightly_cold"
  | "neutral"
  | "slightly_hot"
  | "runs_hot";

export const GENDER_OPTIONS: { value: BabyGender; label: string }[] = [
  { value: "male", label: "男孩" },
  { value: "female", label: "女孩" },
];

export const WARMTH_PREFERENCE_OPTIONS: {
  value: WarmthPreference;
  label: string;
  hint: string;
}[] = [
  { value: "runs_cold", label: "怕冷", hint: "建议多穿一层" },
  { value: "slightly_cold", label: "偏怕冷", hint: "略偏保暖" },
  { value: "neutral", label: "正常", hint: "按标准推荐" },
  { value: "slightly_hot", label: "偏怕热", hint: "略偏透气" },
  { value: "runs_hot", label: "怕热", hint: "建议少穿一层" },
];

export const WARMTH_OFFSET_BY_PREFERENCE: Record<WarmthPreference, number> = {
  runs_cold: 8,
  slightly_cold: 4,
  neutral: 0,
  slightly_hot: -4,
  runs_hot: -8,
};

export const WEARS_DIAPER_OPTIONS: {
  value: WearsDiaperChoice;
  label: string;
}[] = [
  { value: "yes", label: "仍穿尿布" },
  { value: "no", label: "不穿尿布" },
];

/** Profile tip — aligned with DIAPER_OPTIONAL_AGE_MONTHS (36). */
export const WEARS_DIAPER_PROFILE_TIP =
  "满 3 岁的小朋友白天可以尝试不穿尿布了。";

export function wearsDiaperChoiceFromDb(
  value: boolean | null | undefined
): WearsDiaperChoice | "" {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

export function wearsDiaperFromChoice(
  choice: WearsDiaperChoice | ""
): boolean | null {
  if (choice === "yes") return true;
  if (choice === "no") return false;
  return null;
}

export function wearsDiaperLabel(value: boolean | null | undefined): string {
  if (value === true) return "仍穿尿布";
  if (value === false) return "不穿尿布";
  return "—";
}

export function isWearsDiaperChoice(value: string): value is WearsDiaperChoice {
  return WEARS_DIAPER_OPTIONS.some((o) => o.value === value);
}

export function warmthPreferenceLabel(value: WarmthPreference | string | null | undefined): string {
  return WARMTH_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? "正常";
}

export function genderLabel(value: BabyGender | string | null | undefined): string {
  if (value === "unknown" || value == null) return "—";
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}

export function isBabyGender(value: string): value is BabyGender {
  return GENDER_OPTIONS.some((o) => o.value === value);
}

export function isWarmthPreference(value: string): value is WarmthPreference {
  return WARMTH_PREFERENCE_OPTIONS.some((o) => o.value === value);
}

export const DEFAULT_BABY_AVATARS: Record<BabyGender, string> = {
  male: "/avatars/baby-boy-default.jpg",
  female: "/avatars/baby-girl-default.jpg",
};

export function resolveBabyAvatarUrl(
  avatarUrl?: string | null,
  gender?: BabyGender | string | null
): string {
  const url = avatarUrl?.trim();
  const isDefaultAvatar = url === DEFAULT_BABY_AVATARS.male
    || url === DEFAULT_BABY_AVATARS.female
    || url === "/illustrations/fluent/bear_flat.svg"
    || url === "/illustrations/fluent/rabbit_flat.svg";
  if (url && !isDefaultAvatar) return url;
  if (gender === "female") return DEFAULT_BABY_AVATARS.female;
  return DEFAULT_BABY_AVATARS.male;
}
