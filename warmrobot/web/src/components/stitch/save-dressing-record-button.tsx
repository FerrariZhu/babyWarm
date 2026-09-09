"use client";

import { useEffect, useState } from "react";
import type { BriefAdvice, HomeDailyBriefWeather } from "@warmrobot/core/client";
import { MaterialIcon } from "./material-icon";

type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveDressingRecordButton({
  babyId,
  babyName,
  advice,
  weather,
  alreadySaved = false,
  variant = "block",
  outfitRevision = 0,
}: {
  babyId: string;
  babyName: string;
  advice: BriefAdvice;
  weather: HomeDailyBriefWeather;
  alreadySaved?: boolean;
  variant?: "block" | "inline";
  /** Bump when the checklist changes (e.g. 换一换) to leave「已记下」. */
  outfitRevision?: number;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(alreadySaved);

  useEffect(() => {
    setState((current) => (current === "saved" || current === "error" ? "idle" : current));
    setError(null);
  }, [outfitRevision]);

  const current = advice.current;
  const busy = state === "saving";
  const idleLabel = overwrite ? "更新记录" : "确认穿搭";
  const inline = variant === "inline";

  async function save() {
    setState("saving");
    setError(null);
    try {
      const response = await fetch("/api/dressing-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          babyName,
          advice: {
            indoorItems: current.indoorItems,
            outdoorAdditions: current.outdoorAdditions,
            extras: current.extras,
            reason: current.reason,
            requiredWarmth: current.requiredWarmth,
          },
          weather,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setState("error");
        setError(payload.error ?? "保存失败，请重试");
        return;
      }
      setOverwrite(true);
      setState("saved");
    } catch {
      setState("error");
      setError("网络异常，请重试");
    }
  }

  const label = busy ? "记下中…" : state === "saved" ? "已记下" : idleLabel;

  return (
    <div className={inline ? "flex flex-col items-end gap-1" : "flex flex-col gap-2 pt-2"}>
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className={
          inline
            ? "dressing-save font-label-md inline-flex min-h-touch-target-min shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-on-primary transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            : "dressing-save font-label-md inline-flex min-h-touch-target-min w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-on-primary transition-opacity disabled:opacity-60"
        }
      >
        <MaterialIcon
          name={state === "saved" ? "check" : "task_alt"}
          className="text-[20px]"
        />
        {label}
      </button>
      {error && (
        <p role="alert" className={`font-body-md text-error ${inline ? "text-right" : "text-center"}`}>
          {error}
        </p>
      )}
    </div>
  );
}
