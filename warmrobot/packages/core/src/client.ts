/**
 * Browser-safe @warmrobot/core entry — no category-advice / weather fetch / DB assembly.
 * Use in `"use client"` components instead of the root barrel to avoid webpack cycles.
 */
export type {
  AdviceExtra,
  AdviceItem,
  BriefAdvice,
  DressingAdvice,
  HomeDailyBriefWeather,
  SlotSwapGroup,
  SlotSwapOption,
} from "./daily-brief-types";

export type { AdviceConclusionBlock } from "./advice-copy";
export type { CategoryStyleGuide } from "./category-style-guides";
export type { VariantCopyCard } from "./daily-brief-types";
export type { AdviceTipTag, AdviceTipTagTone } from "./advice-tip-tags";
export type { DressingRecord } from "./dressing-records";
export type { PlaceSearchHit, WeatherResult } from "./weather";
export type { WeatherSnapshot } from "./types";

export type { DiaperPromptAnswer, DiaperPromptState } from "./diaper-status";
export {
  adviceFingerprint,
  formatAdviceConclusion,
  formatAdviceConclusionBlocks,
} from "./advice-copy";
export {
  DIAPER_OPTIONAL_AGE_MONTHS,
  DIAPER_PROMPT_COOLDOWN_DAYS_AFTER_YES,
  diaperAdviceSentence,
  shouldRecommendDiaper,
  shouldShowDiaperPrompt,
} from "./diaper-status";
export { resolveAdviceTipTags } from "./advice-tip-tags";
export { effectiveChecklistWarmth } from "./checklist-warmth";
export {
  applySlotSwap,
  formatMaterialFitLine,
  formatSlotSwapOptionLabel,
  fitLabelZh,
  materialLabelZh,
  describeSwapCurrentRow,
  describeSwapOptionRow,
} from "./slot-swap";
export type { SwapPickerRow } from "./slot-swap";
export {
  checklistDisplayChips,
  type ChecklistDisplayChip,
} from "./checklist-display";
export { compactVariantCopy } from "./variant-copy-compact";
export { formatRecordedDateLabel, summarizeOutfit } from "./dressing-records";
export {
  CATEGORY_ICON_KEYS,
  resolveCategoryIcon,
  type CategoryIconMeta,
} from "./category-icons";
