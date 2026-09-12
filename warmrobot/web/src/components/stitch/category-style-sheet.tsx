"use client";

import { useId, useState } from "react";

import {
  buildCategoryGuideView,
  type AdviceItem,
  type CategoryGuideContent,
  type CategoryGuideViewEntry,
} from "@warmrobot/core/client";
import { BottomSheet } from "./bottom-sheet";
import { MaterialIcon } from "./material-icon";

type Props = {
  categoryLabel: string;
  guide?: CategoryGuideContent;
  item: AdviceItem;
  onClose: () => void;
};

function splitGuideIntro(intro: string): string[] {
  return intro
    .replace(/\s+/g, " ")
    .split(/[。！？]/)
    .flatMap((sentence) => sentence.split(/[；;]/))
    .map((point) => point.trim())
    .filter(Boolean);
}

function CategoryGuideImage({
  categoryLabel,
  imageUrl,
  imageAlt,
}: {
  categoryLabel: string;
  imageUrl?: string;
  imageAlt?: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  if (!imageUrl || hasImageError) return null;

  return (
    <section
      aria-label="品类示意图"
      className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest"
    >
      <div className="aspect-[4/3] max-h-[280px] w-full bg-primary-container/15">
        <img
          src={imageUrl}
          alt={imageAlt ?? `${categoryLabel}示意图`}
          decoding="async"
          className="h-full w-full object-contain p-5"
          onError={() => setHasImageError(true)}
        />
      </div>
    </section>
  );
}

function GuideCard({ entry }: { entry: CategoryGuideViewEntry }) {
  const keyPoints = entry.pros.slice(0, 2);
  const primaryCaution = entry.cautions[0];
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(entry.imageUrl) && !hasImageError;
  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        entry.isSelected
          ? "border-primary/45 bg-surface-container-lowest shadow-[0_8px_22px_rgba(50,67,57,0.08)]"
          : "border-outline-variant/35 bg-surface"
      }`}
    >
      <div className={showImage ? "grid grid-cols-[116px_minmax(0,1fr)] gap-3 p-3" : "p-4"}>
        {showImage ? (
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-primary-container/20">
            <img
              src={entry.imageUrl}
              alt={entry.imageAlt ?? `${entry.label}示意图`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-2"
              onError={() => setHasImageError(true)}
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-label-lg text-on-surface">{entry.label}</h3>
            {entry.isSelected ? (
              <span className="font-label-sm ml-auto shrink-0 rounded-md bg-primary-container/50 px-2 py-0.5 text-primary">
                今日推荐
              </span>
            ) : null}
          </div>
          {keyPoints.length ? (
            <div className="guide-card-points mt-2 flex flex-col gap-2.5">
              {keyPoints.map((point, index) => (
                <p
                  key={`${entry.axis}:${entry.value}:${index}`}
                  className="font-body-sm leading-6 text-on-surface-variant"
                >
                  {point}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {primaryCaution ? (
        <div className="border-t border-tertiary/12 bg-tertiary-container/18 px-3 py-2.5">
          <div className="flex items-start gap-2 font-body-sm leading-6 text-on-surface-variant">
            <MaterialIcon name="warning" filled className="mt-0.5 shrink-0 text-[16px] text-tertiary" />
            <span>{primaryCaution}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function GuideSection({ title, entries }: { title: string; entries: CategoryGuideViewEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="font-headline-sm mb-3 text-on-surface">{title}</h2>
      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <GuideCard key={`${entry.axis}:${entry.value}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export function CategoryStyleSheet({ categoryLabel, guide, item, onClose }: Props) {
  const view = guide ? buildCategoryGuideView(guide, item) : null;
  const introPoints = view?.intro ? splitGuideIntro(view.intro) : [];
  const hasStyles = Boolean(view?.styles.length);
  const hasMaterials = Boolean(view?.materials.length);
  const [activeGuide, setActiveGuide] = useState<"styles" | "materials">("styles");
  const tabId = useId();
  const tabs = [
    ...(hasStyles ? [{ id: "styles" as const, label: "款式指南", entries: view?.styles ?? [] }] : []),
    ...(hasMaterials
      ? [{ id: "materials" as const, label: "面料指南", entries: view?.materials ?? [] }]
      : []),
  ];
  const selectedGuide = tabs.find((tab) => tab.id === activeGuide) ?? tabs[0];

  const selectNextTab = (currentTab: "styles" | "materials", direction: 1 | -1) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
    if (nextTab) setActiveGuide(nextTab.id);
  };

  return (
    <BottomSheet title={categoryLabel} subtitle="衣物指南" size="tall" onClose={onClose}>
      {introPoints.length ? (
        <section
          className="rounded-2xl bg-tertiary-container/35 px-4 py-3.5"
          aria-label="衣物选购重点"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary">
              <MaterialIcon name="lightbulb" filled className="text-[20px]" />
            </span>
            <p className="font-body-md pt-0.5 font-semibold leading-6 text-on-surface">
              {introPoints[0]}
            </p>
          </div>

          {introPoints.length > 1 ? (
            <ul className="mt-3 flex flex-col gap-2 border-t border-tertiary/20 pt-3 text-on-surface-variant">
              {introPoints.slice(1).map((point) => (
                <li key={point} className="flex items-start gap-2 font-body-sm leading-6">
                  <MaterialIcon
                    name="check_circle"
                    filled
                    className="mt-1 shrink-0 text-[16px] text-tertiary"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <CategoryGuideImage
        categoryLabel={categoryLabel}
        imageUrl={guide?.imageUrl}
        imageAlt={guide?.imageAlt}
      />

      {tabs.length > 1 ? (
        <div
          className="mt-4 grid grid-cols-2 rounded-xl bg-surface-container-low p-1"
          role="tablist"
          aria-label="衣物指南"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === selectedGuide?.id;
            return (
              <button
                key={tab.id}
                id={`${tabId}-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tabId}-${tab.id}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveGuide(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    selectNextTab(tab.id, 1);
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    selectNextTab(tab.id, -1);
                  }
                }}
                className={`font-label-md rounded-lg px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-[0_2px_7px_rgba(50,67,57,0.12)]"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {view ? (
        <div
          className="mt-5"
          id={`${tabId}-${selectedGuide?.id ?? "guide"}-panel`}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={tabs.length > 1 ? `${tabId}-${selectedGuide?.id}-tab` : undefined}
        >
          {selectedGuide ? <GuideSection title={selectedGuide.label === "款式指南" ? "先看看款式长什么样" : selectedGuide.label} entries={selectedGuide.entries} /> : null}
        </div>
      ) : (
        <p className="font-body-md py-8 text-center text-on-surface-variant">
          这类衣物的选购说明正在整理中。
        </p>
      )}
    </BottomSheet>
  );
}
