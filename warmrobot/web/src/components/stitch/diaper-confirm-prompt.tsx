"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiaperPromptAnswer } from "@warmrobot/core/client";

export function DiaperConfirmPrompt({
  babyId,
  onAnswered,
}: {
  babyId: string;
  onAnswered?: (answer: DiaperPromptAnswer, wearsDiaper: boolean) => void;
}) {
  const router = useRouter();
  const recordedShownRef = useRef(false);
  const [submitting, setSubmitting] = useState<DiaperPromptAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordedShownRef.current) return;
    recordedShownRef.current = true;
    void fetch(`/api/babies/${babyId}/diaper-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shown" }),
    }).catch(() => {
      recordedShownRef.current = false;
    });
  }, [babyId]);

  async function submit(answer: DiaperPromptAnswer) {
    if (submitting) return;
    setSubmitting(answer);
    setError(null);
    try {
      const res = await fetch(`/api/babies/${babyId}/diaper-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", answer }),
      });
      const data = (await res.json()) as { error?: string; wears_diaper?: boolean };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      const wearsDiaper = answer === "yes";
      onAnswered?.(answer, wearsDiaper);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSubmitting(null);
    }
  }

  return (
    <div
      className="mt-2 flex flex-col gap-2 rounded-xl border border-surface-variant/50 bg-surface-container-low px-3 py-2.5"
      role="group"
      aria-label="确认是否仍在穿尿不湿"
    >
      <span className="font-label-sm text-on-surface-variant">还在穿尿不湿吗？</span>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "yes", label: "是" },
            { value: "no", label: "否" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={submitting != null}
            onClick={() => void submit(option.value)}
            className="font-label-md min-h-[36px] rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
          >
            {submitting === option.value ? "保存中…" : option.label}
          </button>
        ))}
      </div>
      {error ? <p className="font-label-sm text-error">{error}</p> : null}
    </div>
  );
}
