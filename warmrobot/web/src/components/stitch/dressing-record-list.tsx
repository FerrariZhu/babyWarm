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

function WeatherLine({ record }: { record: DressingRecord }) {
  const parts: string[] = [];
  if (record.weather?.conditionText) parts.push(record.weather.conditionText);
  if (record.weather?.temp != null) parts.push(`${Math.round(record.weather.temp)}°C`);
  parts.push(`穿衣指数 ${record.requiredWarmth}`);
  return <p className="font-body-md text-on-surface-variant">{parts.join(" · ")}</p>;
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
    <div className="flex flex-col gap-0.5">
      <dt className="font-label-sm text-text-soft">{heading}</dt>
      <dd className="font-body-md text-on-surface">{value || empty}</dd>
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

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-card-padding text-left transition-colors hover:bg-surface-container/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="min-w-0 flex-1">
          <header className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-headline-md text-on-surface">
                {formatRecordedDateLabel(record.recordedDate)}
              </h2>
              <p className="font-label-sm mt-0.5 text-text-soft">
                {formatFullDate(record.recordedDate)}
                {record.babyName ? ` · ${record.babyName}` : ""}
              </p>
            </div>
          </header>
          <div className="mt-2">
            <WeatherLine record={record} />
          </div>
          {!open ? (
            <p className="font-body-md mt-2 line-clamp-2 text-on-surface-variant/85">
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
        <div
          id={panelId}
          className="flex flex-col gap-3 border-t border-outline-variant/30 px-4 pb-4 pt-3"
        >
          {record.locationLabel ? (
            <p className="font-label-sm text-text-soft">{record.locationLabel}</p>
          ) : null}
          <dl className="flex flex-col gap-2">
            <ZoneRow heading="家里穿" value={summary.indoor} empty="—" />
            <ZoneRow heading="出门再加" value={summary.outdoor} empty="出门不用再加衣服。" />
            {summary.extras ? (
              <ZoneRow heading="记得带" value={summary.extras} empty="" />
            ) : null}
          </dl>
          {record.reason ? (
            <p className="font-body-md leading-relaxed text-text-main">{record.reason}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function DressingRecordList({ records }: { records: DressingRecord[] }) {
  if (records.length === 0) {
    return (
      <section className="rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-5 text-center shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <MaterialIcon name="event_note" className="mb-2 text-[32px] text-primary/40" />
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
    <ol className="flex flex-col gap-stack-gap">
      {records.map((record) => (
        <li key={recordKey(record)}>
          <DressingRecordCard record={record} />
        </li>
      ))}
    </ol>
  );
}
