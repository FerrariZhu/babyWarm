"use client";

import type { AdviceConclusionBlock } from "@warmrobot/core/client";
import { DiaperConfirmPrompt } from "@/components/stitch/diaper-confirm-prompt";
import { MaterialIcon } from "./material-icon";

function tipLines(blocks: AdviceConclusionBlock[]): string[] {
  return blocks
    .filter((block) => block.kind === "uv" || block.kind === "rain" || block.kind === "accessory")
    .map((block) => block.lines[0] ?? block.text)
    .filter(Boolean);
}

/** Narrative part of the dressing recommendation: weather summary → diaper guidance → what to wear. */
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
  const hasBody = Boolean(diaper?.lines[0] || (wear?.lines.length ?? 0) > 0);

  return (
    <>
      {weather?.lines[0] ? (
        <p className="advice-weather">{weather.lines[0]}</p>
      ) : null}

      <article className="advice-quote flex flex-col gap-2">
      {hasBody ? (
        <div className="font-body-md space-y-1.5 leading-[1.55] text-on-surface">
          {diaper?.lines[0] ? (
            <div>
              <p className="advice-support">{diaper.lines[0]}</p>
              {showDiaperPrompt && diaperPromptBabyId ? (
                <DiaperConfirmPrompt
                  babyId={diaperPromptBabyId}
                  onAnswered={(_answer, wearsDiaper) => onDiaperPromptAnswered?.(wearsDiaper)}
                />
              ) : null}
            </div>
          ) : null}
          {wear && wear.lines.length > 0 ? (
            <ul className="advice-wear">
              {wear.lines.map((line) => (
                <li key={line}>
                  {line.split(/(包屁衣|防晒衣|防风开衫|开衫|外套|长袖|短袖|纯棉|袜子|遮阳帽|凉鞋|运动鞋)/g).map((part, index) =>
                    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                  )}
                </li>
              ))}
            </ul>
          ) : null}

        </div>
      ) : null}

      </article>
    </>
  );
}

/**
 * Contextual weather and outing reminders are intentionally separate from the
 * clothing recommendation, so caregivers can scan them as optional tips.
 */
export function AdviceTips({ blocks }: { blocks: AdviceConclusionBlock[] }) {
  const tips = tipLines(blocks);
  if (tips.length === 0) return null;

  return (
    <aside className="advice-tips" aria-label="出门小贴士">
      <div className="advice-tips-heading">
        <MaterialIcon name="tips_and_updates" aria-hidden="true" />
        <h3>出门小贴士</h3>
      </div>
      <ul>
        {tips.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </aside>
  );
}
