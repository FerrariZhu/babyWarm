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

function GuideList({
  entries,
  tone,
}: {
  entries: string[];
  tone: "positive" | "caution";
}) {
  if (entries.length === 0) return null;
  const icon = tone === "positive" ? "check_circle" : "warning";
  return (
    <ul
      className={`mt-2 flex flex-col gap-2 rounded-xl border px-3 py-3 font-body-md text-on-surface ${
        tone === "positive"
          ? "border-primary/15 bg-primary-container/30"
          : "border-tertiary/15 bg-tertiary-container/25"
      }`}
      aria-label={tone === "positive" ? "优点" : "注意事项"}
    >
      {entries.map((entry) => (
        <li key={entry} className="flex items-start gap-2">
          <MaterialIcon
            name={icon}
            filled
            className={`mt-0.5 text-[18px] ${
              tone === "positive" ? "text-primary" : "text-tertiary"
            }`}
          />
          <span>{entry}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideCard({ entry }: { entry: CategoryGuideViewEntry }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        entry.isSelected
          ? "border-primary/45 bg-surface-container-lowest shadow-[0_8px_22px_rgba(50,67,57,0.08)]"
          : "border-outline-variant/35 bg-surface"
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-label-lg text-on-surface">{entry.label}</h3>
        {entry.isSelected ? (
          <span className="font-label-sm ml-auto rounded-md bg-primary-container/50 px-2 py-0.5 text-primary">
            当前选择
          </span>
        ) : null}
      </div>
      <GuideList entries={entry.pros} tone="positive" />
      <GuideList entries={entry.cautions} tone="caution" />
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
          className="rounded-2xl bg-tertiary-container/35 px-4 py-4"
          aria-label="衣物选购重点"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary">
              <MaterialIcon name="lightbulb" filled className="text-[20px]" />
            </span>
            <p className="font-body-lg pt-0.5 font-semibold leading-7 text-on-surface">
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
          {selectedGuide ? <GuideSection title={selectedGuide.label} entries={selectedGuide.entries} /> : null}
        </div>
      ) : (
        <p className="font-body-md py-8 text-center text-on-surface-variant">
          这类衣物的选购说明正在整理中。
        </p>
      )}
    </BottomSheet>
  );
}
