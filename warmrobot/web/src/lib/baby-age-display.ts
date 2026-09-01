import { babyAgeInMonths } from "@warmrobot/core";

export function formatBabyAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = babyAgeInMonths(birthDate, now);
  if (months < 1) {
    const days = Math.max(
      1,
      Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${days}天大`;
  }
  if (months < 24) return `${months}个月大`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years}岁`;
  return `${years}岁${rem}个月`;
}
