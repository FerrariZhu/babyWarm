"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/stitch/material-icon";
import {
  calendarDaysForMonth,
  isFutureBirthDate,
  localDateKey,
} from "@/lib/baby-birth-date-utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = Array.from({ length: 12 }, (_, index) => index);

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, monthIndex: month - 1, day };
}

function formatBirthDate(date: string) {
  if (!date) return "请选择宝宝的生日";
  const { year, monthIndex, day } = dateParts(date);
  return `${year}年${monthIndex + 1}月${day}日`;
}

export function BabyBirthDateField({
  id = "baby_dob",
  value,
  onChange,
  required = true,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const today = localDateKey();
  const todayParts = dateParts(today);
  const selectedParts = value ? dateParts(value) : todayParts;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedParts.year);
  const [viewMonth, setViewMonth] = useState(selectedParts.monthIndex);

  useEffect(() => {
    if (!value) return;
    const next = dateParts(value);
    setViewYear(next.year);
    setViewMonth(next.monthIndex);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const days = useMemo(
    () => calendarDaysForMonth(viewYear, viewMonth),
    [viewMonth, viewYear]
  );
  const yearOptions = useMemo(
    () => Array.from({ length: todayParts.year - 1900 + 1 }, (_, index) => todayParts.year - index),
    [todayParts.year]
  );
  const atLatestMonth = viewYear === todayParts.year && viewMonth === todayParts.monthIndex;

  function changeMonth(direction: -1 | 1) {
    const next = new Date(viewYear, viewMonth + direction, 1);
    if (next.getFullYear() > todayParts.year) return;
    if (next.getFullYear() === todayParts.year && next.getMonth() > todayParts.monthIndex) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDate(date: string) {
    if (isFutureBirthDate(date, today)) return;
    onChange(date);
    setOpen(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-4 shadow-[0_2px_12px_rgba(62,102,88,0.03)] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="font-label-caps mb-1.5 block uppercase tracking-wider text-outline">生日</span>
        <button
          id={id}
          type="button"
          aria-label="选择生日"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="font-body-lg flex min-h-12 w-full items-center justify-between gap-4 rounded-xl py-1 text-left text-on-background transition-colors hover:bg-surface-container-low focus-visible:outline-none"
        >
          <span className={value ? "tabular-nums" : "text-outline"}>{formatBirthDate(value)}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <MaterialIcon name="calendar_today" className="text-[19px]" />
          </span>
        </button>
        <input type="hidden" name={id} value={value} required={required} />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-on-surface/20 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-12 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-calendar-title`}
            className="w-full max-w-[420px] rounded-[24px] border border-surface-variant bg-surface-container-lowest p-5 shadow-[0_18px_48px_rgba(47,67,57,0.2)] sheet-slide-up sm:rounded-[20px]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p id={`${id}-calendar-title`} className="font-headline-md text-[20px] text-on-surface">选择生日</p>
                <p className="font-label-md mt-1 text-on-surface-variant">{formatBirthDate(value)}</p>
              </div>
              <button type="button" aria-label="关闭日期选择器" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface">
                <MaterialIcon name="close" className="text-[22px]" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <label className="sr-only" htmlFor={`${id}-year`}>年份</label>
              <select id={`${id}-year`} value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))} className="font-label-md min-h-11 flex-1 rounded-xl border border-surface-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary">
                {yearOptions.map((year) => <option key={year} value={year}>{year}年</option>)}
              </select>
              <label className="sr-only" htmlFor={`${id}-month`}>月份</label>
              <select id={`${id}-month`} value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))} className="font-label-md min-h-11 flex-1 rounded-xl border border-surface-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary">
                {MONTHS.map((month) => (
                  <option key={month} value={month} disabled={viewYear === todayParts.year && month > todayParts.monthIndex}>{month + 1}月</option>
                ))}
              </select>
              <button type="button" aria-label="上个月" onClick={() => changeMonth(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-fixed">
                <MaterialIcon name="chevron_left" className="text-[24px]" />
              </button>
              <button type="button" aria-label="下个月" disabled={atLatestMonth} onClick={() => changeMonth(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-fixed disabled:text-outline-variant">
                <MaterialIcon name="chevron_right" className="text-[24px]" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center" aria-label={`${viewYear}年${viewMonth + 1}月`}>
              {WEEKDAYS.map((weekday) => <span key={weekday} className="font-label-sm py-2 text-on-surface-variant">{weekday}</span>)}
              {days.map(({ date, inMonth }) => {
                const selected = date === value;
                const disabled = isFutureBirthDate(date, today);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={disabled}
                    aria-label={formatBirthDate(date)}
                    aria-pressed={selected}
                    onClick={() => selectDate(date)}
                    className={`m-0.5 flex aspect-square min-h-10 items-center justify-center rounded-xl font-label-md tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "bg-primary text-on-primary shadow-sm" : inMonth ? "text-on-surface hover:bg-primary-fixed hover:text-primary" : "text-outline-variant hover:bg-surface-container-low"} disabled:cursor-not-allowed disabled:text-outline-variant disabled:hover:bg-transparent`}
                  >
                    {dateParts(date).day}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-surface-variant pt-4">
              <button type="button" onClick={() => selectDate(today)} className="font-label-md min-h-11 rounded-xl px-3 text-primary transition-colors hover:bg-primary-fixed">设为今天</button>
              <button type="button" onClick={() => setOpen(false)} className="font-label-md min-h-11 rounded-full bg-primary px-5 text-on-primary shadow-sm transition-opacity hover:opacity-90">完成</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
