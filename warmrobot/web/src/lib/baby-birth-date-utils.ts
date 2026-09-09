export type CalendarDay = {
  date: string;
  inMonth: boolean;
};

function toDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Builds a fixed Sunday-first calendar grid so the picker never jumps in height. */
export function calendarDaysForMonth(year: number, monthIndex: number): CalendarDay[] {
  const firstDay = new Date(year, monthIndex, 1);
  const firstGridDay = new Date(year, monthIndex, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(
      firstGridDay.getFullYear(),
      firstGridDay.getMonth(),
      firstGridDay.getDate() + index
    );
    return {
      date: toDateKey(day.getFullYear(), day.getMonth(), day.getDate()),
      inMonth: day.getMonth() === monthIndex,
    };
  });
}

export function isFutureBirthDate(date: string, today: string): boolean {
  return date > today;
}

export function localDateKey(date = new Date()): string {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}
