"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  AdviceExtra,
  AdviceItem,
  BriefAdvice,
  DressingAdvice,
  HomeDailyBriefWeather,
  CategoryGuideContent,
  WeatherSnapshot,
  CategoryIconMeta,
} from "@warmrobot/core/client";
import {
  adviceFingerprint,
  completeChecklistSelection,
  type CompleteSelectionInput,
  checklistCategoryChoices,
  checklistAxisChoices,
  checklistAxisValue,
  checklistDisplayChips,
  formatAdviceConclusion,
  formatAdviceConclusionBlocks,
  resolveCategoryIcon,
  shouldRecommendDiaper,
  shouldShowDiaperPrompt,
  type ChecklistDisplayChip,
  type DiaperPromptState,
} from "@warmrobot/core/client";
import { AddBabyChecklistPrompt } from "./add-baby-checklist-prompt";
import { AdviceConclusionPanel, AdviceTips } from "./advice-conclusion-panel";
import { CategoryStyleSheet } from "./category-style-sheet";
import { MaterialIcon } from "./material-icon";
import { GarmentChoicePicker } from "./garment-choice-picker";
import { SaveDressingRecordButton } from "./save-dressing-record-button";

/** UI copy — keep in sync with @warmrobot/core ADVICE_COPY where overlapping. */
const COPY = {
  adviceTitle: "穿搭建议",
  checklistTitle: "穿搭清单",
  indoorHeading: "家里穿",
  outdoorHeading: "出门再加",
  extrasHeading: "记得带",
  emptyOutdoor: "出门不用再加衣服。",
  swapLabel: "自选",
} as const;

function weatherForConclusion(weather: HomeDailyBriefWeather): WeatherSnapshot {
  return {
    temp: weather.temp,
    feelsLike: weather.feelsLike,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    pressure: 1013,
    text: weather.conditionText,
    precipProbability: weather.precipProbability,
    uvIndex: weather.uvIndex,
  };
}

function cardKey(item: AdviceItem, index: number): string {
  return item.outfitSlot ?? `${item.id}:${index}`;
}

function BentoCard({ item, zone, categoryIcons, onOpen, onSelectItem }: {
  item: AdviceItem;
  zone: "indoor" | "outdoor" | "extra";
  categoryIcons?: Record<string, CategoryIconMeta>;
  onOpen?: () => void;
  onSelectItem?: (selected: AdviceItem) => void;
}) {
  const categories = checklistCategoryChoices(item);
  const well = zone === "indoor" ? "bg-indoor-surface" : zone === "outdoor" ? "bg-outdoor-surface" : "bg-clothing-extra/15";
  const iconColor = zone === "indoor" ? "text-tertiary" : zone === "outdoor" ? "text-primary" : "text-clothing-extra";
  return (
    <div className="garment-card group/card relative flex flex-col rounded-xl p-2.5">
      <div className="mb-0.5 flex min-h-10 items-center justify-between gap-1.5">
        {(item.kind === "category" || (item.kind === "tip" && item.id === "diaper")) && item.warmthValue != null ? (
          <span className="rounded-full border border-outline-variant/30 bg-surface-container px-2 py-0.5 font-label-sm tabular-nums text-on-surface-variant">
            指数 {item.warmthValue}
          </span>
        ) : <span />}
        {onSelectItem && categories.length > 1 ? (
          <GarmentChoicePicker label="品类" garment={item.label} value={item.category ?? ""}
            choices={categories} onSelect={onSelectItem} iconOnly />
        ) : null}
      </div>
      <CardBody item={item} categoryIcons={categoryIcons} well={well} iconColor={iconColor}
        chips={checklistDisplayChips(item)} showPros={Boolean(item.pros)} onOpen={onOpen} onSelectItem={onSelectItem} />
    </div>
  );
}

function AxisChips({ chips, item, onSelectItem }: {
  chips: ChecklistDisplayChip[];
  item: AdviceItem;
  onSelectItem?: (selected: AdviceItem) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="garment-attributes">
      {chips.map((chip) => {
        const choices = checklistAxisChoices(item, chip.key);
        return onSelectItem && choices.length > 1 ? (
          <GarmentChoicePicker key={chip.key} label={chip.label} garment={item.label}
            value={checklistAxisValue(item, chip.key)} choices={choices} onSelect={onSelectItem} />
        ) : (
          <div key={chip.key} className="garment-attribute-static">
            <span>{chip.label}</span><span>{chip.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function CardBody({
  item,
  categoryIcons,
  well,
  iconColor,
  chips,
  showPros,
  onOpen,
  onSelectItem,
}: {
  item: AdviceItem;
  categoryIcons?: Record<string, CategoryIconMeta>;
  well: string;
  iconColor: string;
  chips: ChecklistDisplayChip[];
  showPros: boolean;
  onOpen?: () => void;
  onSelectItem?: (selected: AdviceItem) => void;
}) {
  const icon = resolveCategoryIcon(item, categoryIcons);
  const identity = (
    <span className="flex min-w-0 items-center justify-center gap-4">
      <span className="flex shrink-0">
        <span className={`garment-picture flex items-center justify-center transition-colors ${well}`}>
          {icon.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon.iconUrl} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <MaterialIcon name={icon.iconKey} className={`text-[22px] font-light ${iconColor}`} />
          )}
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
        <span className={`font-label-md leading-snug text-on-surface ${onOpen ? "min-h-5" : ""}`}>{item.label}</span>
        {item.labelEn ? (
          <span className="font-label-sm font-normal leading-snug tracking-[0.02em] text-text-soft">{item.labelEn}</span>
        ) : null}
      </span>
    </span>
  );

  return (
    <div className="flex w-full flex-col">
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`查看${item.label}款式说明`}
          className="flex w-full min-w-0 flex-col rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          {identity}
        </button>
      ) : <div className="flex w-full min-w-0 flex-col">{identity}</div>}
      <div className="mt-0.5 flex w-full flex-col items-center">
        <AxisChips chips={chips} item={item} onSelectItem={onSelectItem} />
      </div>

      {showPros && item.pros ? (
        <div className="mt-1 w-full border-t border-outline-variant/20 pt-1">
          <p className="font-label-sm leading-snug text-on-surface-variant text-center">
            {item.pros}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ExtraCard({ extra }: { extra: AdviceExtra }) {
  const label = extra.item?.label ?? extra.type;
  return (
    <div className="group flex flex-col items-center rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2.5 text-center shadow-[0px_4px_12px_rgba(0,0,0,0.02)]">
      <div className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-clothing-extra/15">
        <MaterialIcon name="umbrella" className="text-[22px] text-clothing-extra" />
      </div>
      <div className="flex flex-col items-center gap-px">
        <span className="font-label-md text-on-surface">{label}</span>
        {extra.item?.labelEn ? (
          <span className="font-label-sm tracking-[0.02em] text-on-surface-variant/80">
            {extra.item.labelEn}
          </span>
        ) : null}
        {extra.item?.subtitle ? (
          <span className="mt-0.5 font-label-sm leading-snug text-on-surface-variant/65">
            {extra.item.subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BentoSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="outfit-group flex flex-col gap-2" data-zone={heading === COPY.indoorHeading ? "indoor" : heading === COPY.outdoorHeading ? "outdoor" : "extra"}>
      <h4 className="font-label-md text-on-surface">{heading}</h4>
      <div className="grid grid-cols-2 gap-stack-gap overflow-visible">{children}</div>
    </div>
  );
}

/**
 * Home modules below 天气模块:
 * 1) 穿搭建议 — conclusion paragraph
 * 2) 出门小贴士 — contextual UV / rain / accessory reminders
 * 3) 穿搭清单 — indoor / outdoor / extras
 * Compact weather tip tags also live in WeatherWidget.
 */
export function DailyAdviceSection({
  advice,
  weather,
  showChecklist = true,
  categoryGuideByCategory = {},
  categoryIcons = {},
  saveContext = null,
  diaperContext = null,
}: {
  advice: BriefAdvice;
  /** Real-time weather for structured advice copy. */
  weather: HomeDailyBriefWeather;
  /** When false, show add-baby prompt instead of indoor/outdoor/extras lists. */
  showChecklist?: boolean;
  /** Parent-facing clothing guide content keyed by category code. */
  categoryGuideByCategory?: Record<string, CategoryGuideContent>;
  /** Category icon_key / icon_url from DB — overrides built-in seed map. */
  categoryIcons?: Record<string, CategoryIconMeta>;
  /** When set, the checklist can be saved as today's dressing record. */
  saveContext?: {
    babyId: string;
    babyName: string;
    weather: HomeDailyBriefWeather;
    alreadySaved: boolean;
  } | null;
  /** Baby diaper profile + prompt cadence for in-advice confirmation. */
  diaperContext?: {
    babyId: string;
    wearsDiaper: boolean | null;
    promptState: DiaperPromptState;
  } | null;
}) {
  const source = advice.current;
  const outfitSeed = adviceFingerprint(source);
  const [indoorItems, setIndoorItems] = useState(() => source.indoorItems ?? []);
  const [outdoorAdditions, setOutdoorAdditions] = useState(
    () => source.outdoorAdditions ?? []
  );
  const [reason, setReason] = useState(source.reason ?? "");
  const [sheetItem, setSheetItem] = useState<AdviceItem | null>(null);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [pendingSelection, setPendingSelection] = useState<CompleteSelectionInput | null>(null);
  const [outfitRevision, setOutfitRevision] = useState(0);
  const [wearsDiaper, setWearsDiaper] = useState<boolean | null>(
    diaperContext?.wearsDiaper ?? null
  );
  const [promptDismissed, setPromptDismissed] = useState(false);
  const ageMonths = advice.babyAgeMonths ?? 0;

  useEffect(() => {
    setWearsDiaper(diaperContext?.wearsDiaper ?? null);
    setPromptDismissed(false);
  }, [diaperContext?.wearsDiaper, diaperContext?.babyId]);

  const showDiaperPrompt = Boolean(
    diaperContext &&
      !promptDismissed &&
      shouldShowDiaperPrompt(ageMonths, {
        wearsDiaper,
        lastShownAt: diaperContext.promptState.lastShownAt,
        lastAnsweredAt: diaperContext.promptState.lastAnsweredAt,
        lastAnswer: diaperContext.promptState.lastAnswer,
      })
  );

  const filterDiaperItems = useCallback(
    (items: AdviceItem[]) => {
      if (shouldRecommendDiaper(ageMonths, wearsDiaper)) return items;
      return items.filter((item) => !(item.kind === "tip" && item.id === "diaper"));
    },
    [ageMonths, wearsDiaper]
  );

  useEffect(() => {
    const nextIndoor = source.indoorItems ?? [];
    setIndoorItems(nextIndoor);
    setOutdoorAdditions(source.outdoorAdditions ?? []);
    setSelectionNotice("");
    setPendingSelection(null);
    setOutfitRevision((revision) => revision + 1);
    setReason(
      formatAdviceConclusion({
        weather: weatherForConclusion(weather),
        requiredWarmth: source.requiredWarmth,
        indoorItems: filterDiaperItems(nextIndoor),
        outdoorAdditions: source.outdoorAdditions ?? [],
        ageMonths,
        wearsDiaper,
      })
    );
  }, [outfitSeed, wearsDiaper, ageMonths, weather, source.requiredWarmth, source.outdoorAdditions, filterDiaperItems]);

  useEffect(() => {
    if (wearsDiaper === false) {
      setIndoorItems((items) =>
        items.filter((item) => !(item.kind === "tip" && item.id === "diaper"))
      );
    }
  }, [wearsDiaper]);

  function openForCategory(item: AdviceItem) {
    if (item.kind !== "category" || !item.category) return;
    setSheetItem(item);
  }

  function applySwapAt(
    zone: "indoor" | "outdoor",
    index: number,
    selected: AdviceItem
  ) {
    commitSelection({ indoorItems, outdoorAdditions, zone, index, selected,
      requiredWarmth: source.requiredWarmth, bottomSuggestion: source.bottomSuggestion });
  }

  function commitSelection(input: CompleteSelectionInput) {
    const result = completeChecklistSelection(input);
    setSelectionNotice(result.error ?? result.notice);
    if (result.needsBottomDecision) {
      setPendingSelection(input);
      return;
    }
    setPendingSelection(null);
    if (result.error) return;
    const nextIndoor = result.indoorItems;
    const nextOutdoor = result.outdoorAdditions;
    setIndoorItems(nextIndoor);
    setOutdoorAdditions(nextOutdoor);
    if (saveContext) {
      setReason(
        formatAdviceConclusion({
          weather: weatherForConclusion(saveContext.weather),
          requiredWarmth: source.requiredWarmth,
          indoorItems: nextIndoor,
          outdoorAdditions: nextOutdoor,
          ageMonths,
          wearsDiaper,
        })
      );
    }
    setOutfitRevision((revision) => revision + 1);
  }

  const filteredIndoorItems = useMemo(
    () => filterDiaperItems(indoorItems),
    [indoorItems, ageMonths, wearsDiaper, filterDiaperItems]
  );

  const conclusionBlocks = useMemo(
    () =>
      formatAdviceConclusionBlocks({
        weather: weatherForConclusion(weather),
        requiredWarmth: source.requiredWarmth,
        indoorItems: filteredIndoorItems,
        outdoorAdditions,
        ageMonths,
        wearsDiaper,
      }),
    [
      weather,
      source.requiredWarmth,
      filteredIndoorItems,
      outdoorAdditions,
      ageMonths,
      wearsDiaper,
    ]
  );

  function handleDiaperPromptAnswered(nextWearsDiaper: boolean) {
    setWearsDiaper(nextWearsDiaper);
    setPromptDismissed(true);
    if (!nextWearsDiaper) {
      setIndoorItems((items) =>
        items.filter((item) => !(item.kind === "tip" && item.id === "diaper"))
      );
    }
  }

  const liveCurrent: DressingAdvice = {
    ...source,
    indoorItems: filteredIndoorItems,
    outdoorAdditions,
    reason,
  };
  const liveAdvice: BriefAdvice = { ...advice, current: liveCurrent };

  const sheetGuide =
    sheetItem?.category != null
      ? categoryGuideByCategory[sheetItem.category]
      : undefined;

  return (
    <section className="flex flex-col gap-section-spacing" aria-label="穿搭建议与清单">
      <div
        className="advice-surface"
        aria-label="穿搭建议"
      >
        <h2 className="advice-heading font-headline-md text-on-surface">
          <MaterialIcon name="chat_bubble" filled />
          {COPY.adviceTitle}
        </h2>
        {conclusionBlocks.length > 0 && (
          <AdviceConclusionPanel
            blocks={conclusionBlocks}
            showDiaperPrompt={showDiaperPrompt}
            diaperPromptBabyId={diaperContext?.babyId}
            onDiaperPromptAnswered={handleDiaperPromptAnswered}
          />
        )}
      </div>

      <AdviceTips blocks={conclusionBlocks} />

      <div className="outfit-checklist flex flex-col gap-stack-gap" aria-label="穿搭清单">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-headline-md text-on-surface">{COPY.checklistTitle}</h3>
          {showChecklist && saveContext ? (
            <SaveDressingRecordButton
              variant="inline"
              babyId={saveContext.babyId}
              babyName={saveContext.babyName}
              advice={liveAdvice}
              weather={saveContext.weather}
              alreadySaved={saveContext.alreadySaved}
              outfitRevision={outfitRevision}
            />
          ) : null}
        </div>

        {!showChecklist ? (
          <AddBabyChecklistPrompt />
        ) : (
          <>
            {selectionNotice ? <p role="status" className="mb-3 font-label-sm text-on-surface-variant">{selectionNotice}</p> : null}
            {pendingSelection ? (
              <div className="mb-3 flex flex-wrap gap-2" aria-label="是否保留已调整的裤装">
                <button type="button" className="min-h-12 rounded-lg bg-primary px-3 font-label-sm text-on-primary"
                  onClick={() => commitSelection({ ...pendingSelection, bottomDecision: "keep" })}>保留裤子</button>
                <button type="button" className="min-h-12 rounded-lg border border-outline-variant px-3 font-label-sm"
                  onClick={() => commitSelection({ ...pendingSelection, bottomDecision: "remove" })}>移除裤子</button>
                <button type="button" className="min-h-12 rounded-lg px-3 font-label-sm"
                  onClick={() => { setPendingSelection(null); setSelectionNotice("已取消切换"); }}>取消切换</button>
              </div>
            ) : null}
            <BentoSection heading={COPY.indoorHeading}>
              {filteredIndoorItems.map((item) => {
                const index = indoorItems.indexOf(item);
                return (
                <BentoCard
                  key={cardKey(item, index >= 0 ? index : 0)}
                  item={item}
                  zone="indoor"
                  categoryIcons={categoryIcons}
                  onOpen={
                    item.kind === "category" && item.category
                      ? () => openForCategory(item)
                      : undefined
                  }
                  onSelectItem={
                    item.kind === "category" && index >= 0
                      ? (selected) => applySwapAt("indoor", index, selected)
                      : undefined
                  }
                />
                );
              })}
            </BentoSection>

            <BentoSection heading={COPY.outdoorHeading}>
              {outdoorAdditions.length === 0 ? (
                <p className="font-body-md col-span-2 text-on-surface-variant">
                  {COPY.emptyOutdoor}
                </p>
              ) : (
                outdoorAdditions.map((item, index) => (
                  <BentoCard
                    key={cardKey(item, index)}
                    item={item}
                    zone="outdoor"
                    categoryIcons={categoryIcons}
                    onOpen={
                      item.kind === "category" && item.category
                        ? () => openForCategory(item)
                        : undefined
                    }
                    onSelectItem={
                      item.kind === "category"
                        ? (selected) => applySwapAt("outdoor", index, selected)
                        : undefined
                    }
                  />
                ))
              )}
            </BentoSection>

            {liveCurrent.extras.length > 0 && (
              <BentoSection heading={COPY.extrasHeading}>
                {liveCurrent.extras.map((extra) => (
                  <ExtraCard key={extra.type} extra={extra} />
                ))}
              </BentoSection>
            )}
          </>
        )}
      </div>

      {sheetItem ? (
        <CategoryStyleSheet
          categoryLabel={sheetItem.label}
          guide={sheetGuide}
          item={sheetItem}
          onClose={() => setSheetItem(null)}
        />
      ) : null}
    </section>
  );
}
