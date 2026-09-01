"use client";

import type { AdviceConclusionBlock } from "@warmrobot/core/client";
import { DiaperConfirmPrompt } from "@/components/stitch/diaper-confirm-prompt";

/**
 * Single-card narrative layout: weather lead → diaper + wear → merged tips footer.
 * Avoids stacking multiple bordered sub-modules.
 */
export function AdviceConclusionPanel({
  blocks,
  showDiaperPrompt = false,
  diaperPromptBabyId,
  onDiaperPromptAnswered,
}: {
  blocks: AdviceConclusionBlock[];
  showDiaperPrompt?: boolean;
  diaperPromptBabyId?: string;
  onDiaperPromptAnswered?: (wearsDiaper: boolean) => void;
}) {
  if (blocks.length === 0) return null;

  const weather = blocks.find((b) => b.kind === "weather");
  const diaper = blocks.find((b) => b.kind === "diaper");
  const wear = blocks.find((b) => b.kind === "wear");
  const tips = blocks
    .filter((b) => b.kind === "uv" || b.kind === "rain" || b.kind === "accessory")
    .map((b) => b.lines[0] ?? b.text)
    .filter(Boolean);

  const hasBody = Boolean(diaper?.lines[0] || (wear?.lines.length ?? 0) > 0);

  return (
    <article className="flex flex-col gap-2">
      {weather?.lines[0] ? (
        <p className="font-label-md leading-snug text-primary">{weather.lines[0]}</p>
      ) : null}

      {hasBody ? (
        <div className="font-body-md space-y-1.5 leading-[1.55] text-on-surface">
          {diaper?.lines[0] ? (
            <div>
              <p className="text-on-surface-variant">{diaper.lines[0]}</p>
              {showDiaperPrompt && diaperPromptBabyId ? (
                <DiaperConfirmPrompt
                  babyId={diaperPromptBabyId}
                  onAnswered={(_answer, wearsDiaper) => onDiaperPromptAnswered?.(wearsDiaper)}
                />
              ) : null}
            </div>
          ) : null}

          {wear && wear.lines.length > 0 ? (
            <ul className="list-none space-y-1">
              {wear.lines.map((line) => (
                <li
                  key={line}
                  className="relative pl-3.5 before:absolute before:top-[0.72em] before:left-0 before:h-[5px] before:w-[5px] before:rounded-full before:bg-primary/45"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tips.length > 0 ? (
        <p className="font-body-md border-t border-surface-variant/35 pt-2 leading-snug text-on-surface-variant">
          {tips.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
