"use client";

import { useMemo } from "react";
import type { DbSizeLabel } from "@/lib/db/types";
import {
  filterSizesForCategory,
  getSizeFieldHint,
  splitSizeCodes,
} from "@/legacy-wardrobe/lib/clothing-enums";

export function SizePicker({
  sizes,
  category,
  value,
  onChange,
}: {
  sizes: DbSizeLabel[];
  category: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const filtered = useMemo(
    () => filterSizesForCategory(sizes, category),
    [sizes, category]
  );
  const byCode = useMemo(
    () => new Map(filtered.map((s) => [s.code, s])),
    [filtered]
  );
  const { height, letter } = useMemo(
    () => splitSizeCodes(filtered.map((s) => s.code)),
    [filtered]
  );
  const hint = getSizeFieldHint(category);

  function renderGroup(codes: string[], groupLabel: string) {
    if (codes.length === 0) return null;
    return (
      <div className="flex flex-col gap-2">
        <span className="font-label-caps ml-2 text-on-surface-variant">{groupLabel}</span>
        <div className="flex flex-wrap gap-2">
          {codes.map((code) => {
            const item = byCode.get(code);
            if (!item) return null;
            const selected = value === code;
            return (
              <button
                key={code}
                type="button"
                aria-label={item.label}
                aria-pressed={selected}
                onClick={() => onChange(code)}
                className={
                  selected
                    ? "rounded-full bg-primary px-4 py-2 font-label-caps text-on-primary cloud-shadow transition-transform active:scale-95"
                    : "rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 font-label-caps text-on-surface-variant cloud-shadow transition-all hover:border-primary/40 active:scale-95"
                }
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="font-label-caps ml-2 text-on-surface-variant">尺码</label>
      {hint && (
        <p className="font-body-md ml-2 text-[12px] leading-snug text-outline">{hint}</p>
      )}
      {renderGroup(height, letter.length > 0 ? "身高码" : "可选尺码")}
      {renderGroup(letter, "字母码")}
    </div>
  );
}
