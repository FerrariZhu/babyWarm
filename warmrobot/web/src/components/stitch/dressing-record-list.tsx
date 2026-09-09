"use client";

import { useState } from "react";
import type { DressingRecord } from "@warmrobot/core/client";
import { formatRecordedDateLabel, summarizeOutfit } from "@warmrobot/core/client";
import Link from "next/link";
import { MaterialIcon } from "./material-icon";

function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${year}年${month}月${day}日`;
}

function formatTimelineDate(isoDate: string): { month: string; day: string } {
  const [, month, day] = isoDate.split("-").map(Number);
  if (!month || !day) return { month: "记录", day: "" };
  return { month: `${month}月`, day: String(day) };
}

function WeatherLine({ record }: { record: DressingRecord }) {
  const parts: string[] = [];
  if (record.weather?.conditionText) parts.push(record.weather.conditionText);
  if (record.weather?.temp != null) parts.push(`${Math.round(record.weather.temp)}°C`);
  return <p className="font-label-md text-on-surface-variant">{parts.join(" · ")}</p>;
}

function ZoneRow({
  heading,
  value,
  empty,
}: {
  heading: string;
  value: string;
  empty: string;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="font-label-md pt-0.5 text-primary">{heading}</dt>
      <dd className="font-body-md leading-6 text-on-surface">{value || empty}</dd>
    </div>
  );
}

function outfitPreview(summary: ReturnType<typeof summarizeOutfit>): string {
  const parts = [summary.indoor, summary.outdoor, summary.extras].filter(Boolean);
  if (parts.length === 0) return "暂无清单明细";
  return parts.join(" · ");
}

function recordKey(record: DressingRecord): string {
  return record.id ?? `${record.babyId}:${record.recordedDate}`;
}

function DressingRecordCard({ record }: { record: DressingRecord }) {
  const [open, setOpen] = useState(false);
  const summary = summarizeOutfit(record.outfit);
  const panelId = `dressing-record-${recordKey(record)}`;
  const timelineDate = formatTimelineDate(record.recordedDate);

  return (
    <article className="relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4">
      <div className="relative flex flex-col items-center pt-2 text-center after:absolute after:top-16 after:bottom-[-1.5rem] after:w-px after:bg-primary-container">
        <span className="font-label-sm text-text-soft">{timelineDate.month}</span>
        <strong className="font-headline-lg leading-7 text-primary">{timelineDate.day}</strong>
        <span className="mt-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-outline-variant/45 bg-surface-container-lowest shadow-[0px_7px_18px_rgba(52,59,54,0.055)]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-start gap-3 p-card-padding text-left transition-colors hover:bg-primary-fixed/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="font-headline-md text-on-surface">
                {formatRecordedDateLabel(record.recordedDate)}
              </h2>
              {record.babyName ? <p className="font-label-sm text-text-soft">{record.babyName}</p> : null}
            </header>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <WeatherLine record={record} />
              <span className="font-label-sm rounded-full bg-primary-fixed px-2 py-0.5 text-primary">
                指数 {record.requiredWarmth}
              </span>
            </div>
            {!open ? (
              <p className="font-body-md mt-3 line-clamp-2 leading-6 text-on-surface-variant">
                {outfitPreview(summary)}
              </p>
            ) : null}
          </div>
          <MaterialIcon
            name={open ? "expand_less" : "expand_more"}
            className="mt-1 shrink-0 text-[24px] text-on-surface-variant/70"
          />
        </button>

        {open ? (
          <div id={panelId} className="border-t border-outline-variant/30 px-4 pb-4 pt-3">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-label-sm text-text-soft">{formatFullDate(record.recordedDate)}</p>
              {record.locationLabel ? <p className="font-label-sm text-text-soft">· {record.locationLabel}</p> : null}
            </div>
            <dl className="divide-y divide-outline-variant/25">
              <ZoneRow heading="家里穿" value={summary.indoor} empty="—" />
              <ZoneRow heading="出门再加" value={summary.outdoor} empty="出门不用再加衣服。" />
              {summary.extras ? <ZoneRow heading="记得带" value={summary.extras} empty="" /> : null}
            </dl>
            {record.reason ? (
              <div className="mt-3 rounded-xl bg-indoor-surface px-3 py-3">
                <p className="font-label-sm mb-1 text-text-soft">当日建议</p>
                <p className="font-body-md leading-6 text-text-main">{record.reason}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function DressingRecordList({ records }: { records: DressingRecord[] }) {
  if (records.length === 0) {
    return (
      <section className="rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-5 text-center shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/illustrations/fluent/memo_flat.svg" width="72" height="72" alt="" className="mx-auto mb-4 h-[72px] w-[72px]" />
        <h2 className="font-headline-md mb-1.5 text-on-surface">还没有穿衣记录</h2>
        <p className="font-body-md mb-4 text-on-surface-variant">
          打开首页，把今天的穿搭清单保存下来。
        </p>
        <Link
          href="/"
          className="font-label-md inline-flex min-h-touch-target-min items-center justify-center gap-2 rounded-full bg-primary px-6 text-on-primary"
        >
          去保存今日清单
        </Link>
      </section>
    );
  }

  return (
    <ol className="flex flex-col gap-6">
      {records.map((record) => (
        <li key={recordKey(record)} className="last:[&>article>div:first-child]:after:hidden">
          <DressingRecordCard record={record} />
        </li>
      ))}
    </ol>
  );
}
