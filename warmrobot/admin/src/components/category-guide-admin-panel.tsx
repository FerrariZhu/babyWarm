"use client";

import { useEffect, useState, useTransition } from "react";
import type { CategoryGuideContent, CategoryGuideEntry } from "@warmrobot/core/admin";
import { saveAdminCategoryGuide } from "@/app/admin/variants/category-guide-actions";

type Props = {
  categoryCode: string;
  categoryName: string;
  initialGuide?: CategoryGuideContent;
};

function updateEntryText(
  entries: CategoryGuideEntry[],
  index: number,
  key: "pros" | "cautions",
  line: number,
  value: string
) {
  return entries.map((entry, entryIndex) => {
    if (entryIndex !== index) return entry;
    const nextLines = [...entry[key]];
    nextLines[line] = value;
    return { ...entry, [key]: nextLines };
  });
}

function EntryEditor({
  entry,
  onChange,
}: {
  entry: CategoryGuideEntry;
  onChange: (key: "pros" | "cautions", line: number, value: string) => void;
}) {
  return (
    <article className="rounded-xl border border-outline-variant/45 bg-surface p-3">
      <h4 className="font-label-lg text-on-surface">{entry.label}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {([
          ["pros", "勾选内容"],
          ["cautions", "提醒内容"],
        ] as const).map(([key, label]) => (
          <fieldset key={key} className="flex flex-col gap-2">
            <legend className="font-label-sm text-text-soft">{label}（最多 2 条）</legend>
            {[0, 1].map((line) => (
              <textarea
                key={`${entry.axis}-${entry.value}-${key}-${line}`}
                rows={2}
                value={entry[key][line] ?? ""}
                placeholder="没有内容可留空"
                onChange={(event) => onChange(key, line, event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm"
              />
            ))}
          </fieldset>
        ))}
      </div>
    </article>
  );
}

function GuideGroup({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: CategoryGuideEntry[];
  onChange: (index: number, key: "pros" | "cautions", line: number, value: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-headline-md text-on-background">{title}</h3>
      {entries.map((entry, index) => (
        <EntryEditor
          key={`${entry.axis}:${entry.value}`}
          entry={entry}
          onChange={(key, line, value) => onChange(index, key, line, value)}
        />
      ))}
    </section>
  );
}

export function CategoryGuideAdminPanel({ categoryCode, categoryName, initialGuide }: Props) {
  const [guide, setGuide] = useState<CategoryGuideContent | null>(initialGuide ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setGuide(initialGuide ?? null);
    setError(null);
    setSaved(false);
  }, [initialGuide, categoryCode]);

  if (!guide) {
    return (
      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
        <h2 className="font-headline-md text-on-background">衣物介绍</h2>
        <p className="font-body-md mt-2 text-text-soft">该品类暂未配置面向家长的介绍内容。</p>
      </section>
    );
  }

  function updateGroup(
    group: "styles" | "materials",
    index: number,
    key: "pros" | "cautions",
    line: number,
    value: string
  ) {
    setSaved(false);
    setGuide((current) =>
      current
        ? { ...current, [group]: updateEntryText(current[group], index, key, line, value) }
        : current
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
      <div>
        <h2 className="font-headline-md text-on-background">衣物介绍</h2>
        <p className="font-body-md mt-1 text-text-soft">{categoryName}的科普、款式指南与面料指南。</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-label-md flex items-center justify-between text-on-surface">
          品类科普 <span className="text-text-soft">{guide.intro.length}/100</span>
        </span>
        <textarea
          rows={3}
          maxLength={100}
          value={guide.intro}
          onChange={(event) => {
            setSaved(false);
            setGuide({ ...guide, intro: event.target.value });
          }}
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
        />
      </label>

      <GuideGroup title="款式指南" entries={guide.styles} onChange={(...args) => updateGroup("styles", ...args)} />
      <GuideGroup title="面料指南" entries={guide.materials} onChange={(...args) => updateGroup("materials", ...args)} />

      {error ? <p role="alert" className="font-body-md text-error">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await saveAdminCategoryGuide(guide);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setGuide(result.data);
              setSaved(true);
            });
          }}
          className="font-label-md rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存介绍"}
        </button>
        {saved ? <span className="font-label-sm text-primary">已保存</span> : null}
      </div>
    </section>
  );
}
