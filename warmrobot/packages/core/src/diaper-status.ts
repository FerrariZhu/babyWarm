import { babyAgeInMonths } from "./baby-age";
import { DIAPER_OPTIONAL_AGE_MONTHS } from "./warmth-thresholds";

export { DIAPER_OPTIONAL_AGE_MONTHS };

/** Days to wait after user confirms still wearing before showing prompt again. */
export const DIAPER_PROMPT_COOLDOWN_DAYS_AFTER_YES = 30;

export type DiaperPromptAnswer = "yes" | "no";

export interface DiaperPromptState {
  wearsDiaper: boolean | null;
  lastShownAt: string | null;
  lastAnsweredAt: string | null;
  lastAnswer: DiaperPromptAnswer | null;
}

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDayMs(a) === startOfLocalDayMs(b);
}

/** Age phrase for diaper copy:「8 个月」「1 岁」「1 岁 6 个月」. */
export function formatDiaperAgePhrase(ageMonths: number): string {
  if (ageMonths < 12) return `${ageMonths} 个月`;
  const years = Math.floor(ageMonths / 12);
  const rem = ageMonths % 12;
  if (rem === 0) return `${years} 岁`;
  return `${years} 岁 ${rem} 个月`;
}

export function shouldRecommendDiaper(
  ageMonths: number,
  wearsDiaper: boolean | null = null
): boolean {
  if (wearsDiaper === false) return false;
  if (wearsDiaper === true) return true;
  return ageMonths < DIAPER_OPTIONAL_AGE_MONTHS;
}

/** Caregiver diaper sentence; null when copy should be omitted entirely. */
export function diaperAdviceSentence(
  ageMonths: number,
  wearsDiaper: boolean | null = null
): string | null {
  if (wearsDiaper === false) return null;
  const age = formatDiaperAgePhrase(ageMonths);
  if (ageMonths >= DIAPER_OPTIONAL_AGE_MONTHS) {
    return `小朋友已经 ${age}了，尿布可以不穿。`;
  }
  return `小朋友才 ${age}，建议穿尿布。`;
}

/**
 * Whether to show the yes/no diaper confirmation under the advice sentence.
 * See product spec: monthly cadence after「是」, daily if ignored, never after「否」/ profile off.
 */
export function shouldShowDiaperPrompt(
  ageMonths: number,
  state: DiaperPromptState,
  now: Date = new Date()
): boolean {
  if (state.wearsDiaper === false) return false;
  if (ageMonths < DIAPER_OPTIONAL_AGE_MONTHS) return false;
  if (state.lastAnswer === "no") return false;

  if (state.lastAnswer === "yes" && state.lastAnsweredAt) {
    const answeredAt = new Date(state.lastAnsweredAt);
    const daysSince =
      (now.getTime() - answeredAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince < DIAPER_PROMPT_COOLDOWN_DAYS_AFTER_YES) return false;
  }

  if (!state.lastShownAt) return true;

  const lastShown = new Date(state.lastShownAt);
  if (isSameLocalDay(lastShown, now)) return false;

  return true;
}

export function diaperPromptStateFromBirthDate(
  birthDate: string,
  state: DiaperPromptState,
  now: Date = new Date()
): { ageMonths: number; showPrompt: boolean } {
  const ageMonths = babyAgeInMonths(birthDate, now);
  return {
    ageMonths,
    showPrompt: shouldShowDiaperPrompt(ageMonths, state, now),
  };
}
