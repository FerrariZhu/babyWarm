"use client";

import type { VariantCopyCard } from "@warmrobot/core/client";
import { BottomSheet } from "./bottom-sheet";

type Props = {
  categoryLabel: string;
  cards: VariantCopyCard[];
  recommendedTitle?: string;
  recommendedSubtitle?: string;
  onClose: () => void;
};

function isRecommendedCard(
  card: VariantCopyCard,
  recommendedTitle?: string,
  recommendedSubtitle?: string
): boolean {
  if (!recommendedTitle) return false;
  if (card.title !== recommendedTitle) return false;
  return (card.subtitle ?? "") === (recommendedSubtitle ?? "");
}

export function CategoryStyleSheet({
  categoryLabel,
  cards,
  recommendedTitle,
  recommendedSubtitle,
  onClose,
}: Props) {
  return (
    <BottomSheet
      title={categoryLabel}
      subtitle="款式与面料"
      size="tall"
      onClose={onClose}
    >
      {cards.length === 0 ? (
        <p className="font-body-md py-8 text-center text-on-surface-variant">
          暂无更多款式说明，可按清单推荐选购。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => {
            const recommended = isRecommendedCard(
              card,
              recommendedTitle,
              recommendedSubtitle
            );
            return (
              <li
                key={card.id}
                className={`rounded-xl border px-4 py-3 ${
                  recommended
                    ? "border-primary/45 bg-primary-container/25"
                    : "border-outline-variant/35 bg-surface"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="font-label-md text-on-surface">
                    {card.subtitle ? `${card.title} · ${card.subtitle}` : card.title}
                  </h3>
                  {recommended ? (
                    <span className="font-label-sm rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                      今日推荐
                    </span>
                  ) : null}
                </div>
                <dl className="flex flex-col gap-2">
                  {card.pros ? (
                    <div>
                      <dt className="font-label-sm text-tertiary">优点</dt>
                      <dd className="font-body-md mt-0.5 text-on-surface">{card.pros}</dd>
                    </div>
                  ) : null}
                  {card.cons ? (
                    <div>
                      <dt className="font-label-sm text-on-surface-variant">局限</dt>
                      <dd className="font-body-md mt-0.5 text-on-surface">{card.cons}</dd>
                    </div>
                  ) : null}
                  {card.usageTips ? (
                    <div>
                      <dt className="font-label-sm text-primary">适用场景</dt>
                      <dd className="font-body-md mt-0.5 text-on-surface">
                        {card.usageTips}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
