"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  AdviceExtra,
  AdviceItem,
  BriefAdvice,
  DressingAdvice,
  HomeDailyBriefWeather,
  VariantCopyCard,
  WeatherSnapshot,
} from "@warmrobot/core/client";
import {
  adviceFingerprint,
  applySlotSwap,
  checklistDisplayChips,
  formatAdviceConclusion,
  formatAdviceConclusionBlocks,
  shouldRecommendDiaper,
  shouldShowDiaperPrompt,
  type ChecklistDisplayChip,
  type DiaperPromptState,
} from "@warmrobot/core/client";
import { AddBabyChecklistPrompt } from "./add-baby-checklist-prompt";
import { AdviceConclusionPanel } from "./advice-conclusion-panel";
import { CategoryStyleSheet } from "./category-style-sheet";
import { MaterialIcon } from "./material-icon";
import { SaveDressingRecordButton } from "./save-dressing-record-button";
import { SlotSwapPopover } from "./slot-swap-popover";

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

function itemIcon(item: AdviceItem): string {
  if (item.kind === "tip") {
    if (item.id === "diaper") return "baby_changing_station";
    if (item.id === "umbrella") return "umbrella";
    return "tips_and_updates";
  }
  if (item.category?.startsWith("outer_")) return "checkroom";
  if (item.category === "hat") return "apparel";
  if (item.category === "socks") return "steps";
  if (item.category?.includes("pant")) return "styler";
  return "styler";
}

function cardKey(item: AdviceItem, index: number): string {
  return item.outfitSlot ?? `${item.id}:${index}`;
}

function swapKey(zone: "indoor" | "outdoor", item: AdviceItem, index: number): string {
  return `${zone}:${cardKey(item, index)}`;
}

function BentoCard({
  item,
  zone,
  onOpen,
  onSwapSelect,
  swapOpen,
  onSwapOpenChange,
}: {
  item: AdviceItem;
  zone: "indoor" | "outdoor" | "extra";
  onOpen?: () => void;
  onSwapSelect?: (selectedIndex: number) => void;
  swapOpen: boolean;
  onSwapOpenChange: (open: boolean) => void;
}) {
  const swapButtonRef = useRef<HTMLButtonElement>(null);
  const well =
    zone === "indoor"
      ? "bg-indoor-surface group-hover/card:bg-tertiary-fixed"
      : zone === "outdoor"
        ? "bg-outdoor-surface group-hover/card:bg-primary-fixed"
        : "bg-clothing-extra/15 group-hover/card:bg-clothing-extra/25";
  const iconColor =
    zone === "indoor"
      ? "text-tertiary"
      : zone === "outdoor"
        ? "text-primary"
        : "text-clothing-extra";

  const canSwap = Boolean(
    onSwapSelect && item.alternatives && item.alternatives.length > 0
  );
  const chips = checklistDisplayChips(item);
  const showPros = Boolean(item.pros);

  return (
    <div className="group/card relative flex flex-col overflow-visible rounded-xl border border-outline-variant/35 bg-surface-container-lowest p-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]">
      <div className="mb-0.5 flex min-h-7 items-center justify-between gap-1.5">
        {item.warmthValue != null ? (
          <span
            className="inline-flex items-center gap-0.5 rounded-full border border-outline-variant/30 bg-surface-container/80 px-2 py-0.5 text-on-surface-variant/75 backdrop-blur-[2px]"
            aria-label={`穿衣指数 ${item.warmthValue}`}
          >
            <span className="font-label-sm leading-none opacity-75">指数</span>
            <span className="font-label-sm tabular-nums leading-none text-on-surface-variant/90">
              {item.warmthValue}
            </span>
          </span>
        ) : (
          <span aria-hidden="true" className="inline-block h-6 w-[3.25rem]" />
        )}

        {canSwap ? (
          <>
            <button
              ref={swapButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwapOpenChange(!swapOpen);
              }}
              aria-label={`${COPY.swapLabel}，查看${item.label}的其他可选类型`}
              aria-haspopup="listbox"
              aria-expanded={swapOpen}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary/90 transition-colors hover:bg-primary/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                swapOpen ? "bg-primary/10" : ""
              }`}
            >
              <MaterialIcon
                name="expand_more"
                className={`text-[22px] transition-transform duration-200 ${swapOpen ? "rotate-180" : ""}`}
              />
            </button>
            <SlotSwapPopover
              open={swapOpen}
              anchorRef={swapButtonRef}
              current={item}
              alternatives={item.alternatives ?? []}
              alternativeGroups={item.alternativeGroups}
              onSelect={(selectedIndex) => {
                onSwapSelect?.(selectedIndex);
                onSwapOpenChange(false);
              }}
              onClose={() => onSwapOpenChange(false)}
            />
          </>
        ) : (
          <span aria-hidden="true" className="inline-block h-8 w-8" />
        )}
      </div>

      {onOpen ? (
        <button
          type="button"
          className="flex w-full flex-1 cursor-pointer flex-col rounded-lg px-0.5 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`查看${item.label}款式说明`}
        >
          <CardBody
            item={item}
            well={well}
            iconColor={iconColor}
            chips={chips}
            showPros={showPros}
          />
        </button>
      ) : (
        <div className="flex w-full flex-1 flex-col px-0.5 text-center">
          <CardBody
            item={item}
            well={well}
            iconColor={iconColor}
            chips={chips}
            showPros={showPros}
          />
        </div>
      )}
    </div>
  );
}

function AxisChips({ chips }: { chips: ChecklistDisplayChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-label-sm leading-snug">
      {chips.map((chip, index) => (
        <span key={chip.key} className="contents">
          {index > 0 ? (
            <span aria-hidden="true" className="text-on-surface-variant/20">
              ·
            </span>
          ) : null}
          <span className="inline-flex items-baseline gap-1">
            <span className="text-on-surface-variant/55">{chip.label}</span>
            <span className="text-on-surface/85">{chip.value}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

function CardBody({
  item,
  well,
  iconColor,
  chips,
  showPros,
}: {
  item: AdviceItem;
  well: string;
  iconColor: string;
  chips: ChecklistDisplayChip[];
  showPros: boolean;
}) {
  return (
    <div className="flex w-full flex-col">
      <div className="mb-1.5 flex justify-center">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${well}`}
        >
          <MaterialIcon
            name={itemIcon(item)}
            className={`text-[22px] font-light ${iconColor}`}
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-1">
        <div className="flex min-w-0 flex-col items-center gap-px text-center">
          <span className="font-label-md leading-snug text-on-surface">{item.label}</span>
          {item.labelEn ? (
            <span className="font-label-sm font-normal leading-snug tracking-[0.02em] text-on-surface-variant/42 line-clamp-1">
              {item.labelEn}
            </span>
          ) : null}
        </div>

        <AxisChips chips={chips} />
      </div>

      {showPros && item.pros ? (
        <div className="mt-1.5 w-full border-t border-outline-variant/20 pt-1.5">
          <p className="font-label-sm leading-snug text-on-surface/85 line-clamp-2 text-center">
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
    <div className="flex flex-col gap-2">
      <h4 className="font-label-md text-text-soft">{heading}</h4>
      <div className="grid grid-cols-2 gap-stack-gap overflow-visible">{children}</div>
    </div>
  );
}

/**
 * Home modules below 天气模块:
 * 1) 穿搭建议 — conclusion paragraph
 * 2) 穿搭清单 — indoor / outdoor / extras
 * Weather tip tags live in WeatherWidget, not here.
 */
export function DailyAdviceSection({
  advice,
  weather,
  showChecklist = true,
  variantCopyByCategory = {},
  saveContext = null,
  diaperContext = null,
}: {
  advice: BriefAdvice;
  /** Real-time weather for structured advice copy. */
  weather: HomeDailyBriefWeather;
  /** When false, show add-baby prompt instead of indoor/outdoor/extras lists. */
  showChecklist?: boolean;
  /** Variant pros/cons cards keyed by category code. */
  variantCopyByCategory?: Record<string, VariantCopyCard[]>;
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
  const [openSwapKey, setOpenSwapKey] = useState<string | null>(null);
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
    setOpenSwapKey(null);
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
    selectedIndex: number
  ) {
    const list = zone === "indoor" ? indoorItems : outdoorAdditions;
    const item = list[index];
    if (!item) return;
    const swapped = applySlotSwap(item, selectedIndex);
    if (!swapped) return;

    const nextList = list.map((entry, i) => (i === index ? swapped : entry));
    const nextIndoor = zone === "indoor" ? nextList : indoorItems;
    const nextOutdoor = zone === "outdoor" ? nextList : outdoorAdditions;
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

  const sheetCards =
    sheetItem?.category != null
      ? (variantCopyByCategory[sheetItem.category] ?? [])
      : [];

  return (
    <section className="flex flex-col gap-section-spacing" aria-label="穿搭建议与清单">
      <div
        className="rounded-2xl border border-tertiary-fixed-dim/30 bg-indoor-surface p-card-padding shadow-[0px_4px_12px_rgba(0,0,0,0.03)]"
        aria-label="穿搭建议"
      >
        <h2 className="font-headline-md mb-2 text-on-tertiary-container">
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

      <div className="flex flex-col gap-stack-gap" aria-label="穿搭清单">
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
            <BentoSection heading={COPY.indoorHeading}>
              {filteredIndoorItems.map((item) => {
                const index = indoorItems.indexOf(item);
                return (
                <BentoCard
                  key={cardKey(item, index >= 0 ? index : 0)}
                  item={item}
                  zone="indoor"
                  swapOpen={openSwapKey === swapKey("indoor", item, index >= 0 ? index : 0)}
                  onSwapOpenChange={(open) =>
                    setOpenSwapKey(
                      open ? swapKey("indoor", item, index >= 0 ? index : 0) : null
                    )
                  }
                  onOpen={
                    item.kind === "category" && item.category
                      ? () => openForCategory(item)
                      : undefined
                  }
                  onSwapSelect={
                    item.kind === "category" && index >= 0
                      ? (selectedIndex) => applySwapAt("indoor", index, selectedIndex)
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
                    swapOpen={openSwapKey === swapKey("outdoor", item, index)}
                    onSwapOpenChange={(open) =>
                      setOpenSwapKey(open ? swapKey("outdoor", item, index) : null)
                    }
                    onOpen={
                      item.kind === "category" && item.category
                        ? () => openForCategory(item)
                        : undefined
                    }
                    onSwapSelect={
                      item.kind === "category"
                        ? (selectedIndex) => applySwapAt("outdoor", index, selectedIndex)
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
          cards={sheetCards}
          recommendedTitle={sheetItem.label}
          recommendedSubtitle={sheetItem.subtitle}
          onClose={() => setSheetItem(null)}
        />
      ) : null}
    </section>
  );
}
