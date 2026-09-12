"use client";

import type {
  AdviceConclusionBlock,
  AdviceTipTag,
  DressingMethodCopy,
  OutfitAdviceRow,
} from "@warmrobot/core/client";
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
  method,
  methodIconSrc,
  outfitRows,
  tipTags,
  showDiaperPrompt = false,
  diaperPromptBabyId,
  onDiaperPromptAnswered,
}: {
  blocks: AdviceConclusionBlock[];
  method: DressingMethodCopy;
  methodIconSrc?: string;
  outfitRows: OutfitAdviceRow[];
  tipTags: AdviceTipTag[];
  showDiaperPrompt?: boolean;
  diaperPromptBabyId?: string;
  onDiaperPromptAnswered?: (wearsDiaper: boolean) => void;
}) {
  if (blocks.length === 0) return null;

  const weather = blocks.find((b) => b.kind === "weather");
  const diaper = blocks.find((b) => b.kind === "diaper");
  const hasBody = Boolean(diaper?.lines[0] || outfitRows.length > 0);

  return (
    <>
      {weather?.lines[0] ? (
        <p className="advice-weather">{weather.lines[0]}</p>
      ) : null}

      {hasBody ? (
        <div className="advice-content text-on-surface">
          {diaper?.lines[0] ? (
            <div className="advice-diaper">
              <p className="advice-support">{diaper.lines[0]}</p>
              {showDiaperPrompt && diaperPromptBabyId ? (
                <DiaperConfirmPrompt
                  babyId={diaperPromptBabyId}
                  onAnswered={(_answer, wearsDiaper) => onDiaperPromptAnswered?.(wearsDiaper)}
                />
              ) : null}
            </div>
          ) : null}

          <section className="advice-method" aria-label={method.title}>
            <span className="advice-method-visual" aria-hidden="true">
              {methodIconSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={methodIconSrc} alt="" />
              ) : (
                <MaterialIcon name="checkroom" />
              )}
            </span>
            <div className="advice-method-copy">
              <h3>{method.title}</h3>
              <div className="advice-method-steps">
                {method.steps.map((step) => <span key={step}>{step}</span>)}
              </div>
              <p>{method.note}</p>
            </div>
          </section>

          {outfitRows.length > 0 ? (
            <div className="advice-outfit" aria-label="今日穿衣建议">
              {outfitRows.map((row) => (
                <div className="advice-outfit-row" key={row.zone}>
                  <span>{row.zone}</span>
                  <p>{row.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tipTags.length > 0 ? (
        <div className="advice-tip-chips" aria-label="天气提醒">
          {tipTags.map((tag) => (
            <span key={tag.code} data-tone={tag.tone}>{tag.label}</span>
          ))}
        </div>
      ) : null}
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
