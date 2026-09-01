"use client";

import { useMemo, useState } from "react";
import { BottomSheet } from "./bottom-sheet";
import {
  addCalendarDays,
  currentHourKey,
  localRecommendedDate,
} from "@/lib/daily-brief/format";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type DayOption = {
  date: string;
  label: string;
};

export function HourPickerSheet({
  value,
  onConfirm,
  onClose,
}: {
  /** Hour key `YYYY-MM-DDTHH`; null means current hour. */
  value: string | null;
  onConfirm: (hourKey: string | null) => void;
  onClose: () => void;
}) {
  const nowKey = currentHourKey();
  const today = localRecommendedDate();
  const tomorrow = addCalendarDays(today, 1);
  const initial = value ?? nowKey;
  const [date, setDate] = useState(initial.slice(0, 10));
  const [hour, setHour] = useState(Number(initial.slice(11, 13)));

  const days = useMemo<DayOption[]>(
    () => [
      { date: today, label: "今天" },
      { date: tomorrow, label: "明天" },
    ],
    [today, tomorrow]
  );

  const selectedKey = `${date}T${String(hour).padStart(2, "0")}`;
  const isNow = selectedKey === nowKey;

  return (
    <BottomSheet
      title="选择时间"
      subtitle="按此时天气给出穿搭"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => onConfirm(isNow ? null : selectedKey)}
          className="font-label-md flex min-h-touch-target-min w-full items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {isNow ? "查看现在穿搭" : "查看此时穿搭"}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-1">
          {days.map((day) => {
            const selected = day.date === date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setDate(day.date)}
                className={`font-label-md min-h-11 rounded-xl px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                aria-pressed={selected}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onConfirm(null);
          }}
          className={`font-label-md flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            isNow
              ? "border-primary/20 bg-primary-fixed text-on-primary-container"
              : "border-outline-variant/50 bg-surface-container-lowest text-on-surface hover:border-primary/30"
          }`}
        >
          现在 · {Number(nowKey.slice(11, 13))}时
        </button>

        <div>
          <p className="font-label-sm mb-2 text-on-surface-variant">小时</p>
          <div className="grid grid-cols-4 gap-2">
            {HOURS.map((item) => {
              const selected = item === hour;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setHour(item)}
                  className={`font-label-md min-h-12 rounded-xl tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    selected
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  }`}
                  aria-pressed={selected}
                >
                  {item}时
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
