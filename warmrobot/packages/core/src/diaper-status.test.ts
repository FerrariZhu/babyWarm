import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIAPER_OPTIONAL_AGE_MONTHS,
  DIAPER_PROMPT_COOLDOWN_DAYS_AFTER_YES,
  diaperAdviceSentence,
  shouldRecommendDiaper,
  shouldShowDiaperPrompt,
  type DiaperPromptState,
} from "./diaper-status";

const baseState = (): DiaperPromptState => ({
  wearsDiaper: null,
  lastShownAt: null,
  lastAnsweredAt: null,
  lastAnswer: null,
});

describe("shouldRecommendDiaper", () => {
  it("respects explicit profile off", () => {
    assert.equal(shouldRecommendDiaper(10, false), false);
    assert.equal(shouldRecommendDiaper(40, false), false);
  });

  it("keeps diaper for explicit on at older ages", () => {
    assert.equal(shouldRecommendDiaper(40, true), true);
  });

  it("defaults to age gate when unknown", () => {
    assert.equal(shouldRecommendDiaper(10, null), true);
    assert.equal(shouldRecommendDiaper(40, null), false);
  });
});

describe("diaperAdviceSentence", () => {
  it("omits copy when profile says no diaper", () => {
    assert.equal(diaperAdviceSentence(38, false), null);
    assert.equal(diaperAdviceSentence(10, false), null);
  });

  it("keeps age-based copy otherwise", () => {
    assert.match(diaperAdviceSentence(38, null)!, /可以不穿/);
    assert.match(diaperAdviceSentence(10, null)!, /建议穿尿布/);
  });
});

describe("shouldShowDiaperPrompt", () => {
  it("only prompts at optional age and above", () => {
    assert.equal(
      shouldShowDiaperPrompt(DIAPER_OPTIONAL_AGE_MONTHS - 1, baseState()),
      false
    );
    assert.equal(
      shouldShowDiaperPrompt(DIAPER_OPTIONAL_AGE_MONTHS, baseState()),
      true
    );
  });

  it("never prompts when profile or last answer is no", () => {
    assert.equal(
      shouldShowDiaperPrompt(40, { ...baseState(), wearsDiaper: false }),
      false
    );
    assert.equal(
      shouldShowDiaperPrompt(40, { ...baseState(), lastAnswer: "no" }),
      false
    );
  });

  it("shows once per local day when ignored", () => {
    const now = new Date("2026-08-31T15:00:00");
    const morning = new Date("2026-08-31T09:00:00");
    const state = { ...baseState(), lastShownAt: morning.toISOString() };
    assert.equal(shouldShowDiaperPrompt(40, state, now), false);

    const nextDay = new Date("2026-09-01T09:00:00");
    assert.equal(shouldShowDiaperPrompt(40, state, nextDay), true);
  });

  it("waits a month after yes before showing again", () => {
    const answered = new Date("2026-08-01T10:00:00");
    const state: DiaperPromptState = {
      ...baseState(),
      lastAnswer: "yes",
      lastAnsweredAt: answered.toISOString(),
      lastShownAt: answered.toISOString(),
    };
    const withinMonth = new Date("2026-08-20T10:00:00");
    assert.equal(shouldShowDiaperPrompt(40, state, withinMonth), false);

    const afterMonth = new Date("2026-09-02T10:00:00");
    assert.equal(shouldShowDiaperPrompt(40, state, afterMonth), true);
    assert.ok(
      (afterMonth.getTime() - answered.getTime()) / (24 * 60 * 60 * 1000) >=
        DIAPER_PROMPT_COOLDOWN_DAYS_AFTER_YES
    );
  });
});
