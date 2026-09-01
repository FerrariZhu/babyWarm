"use client";

import { useMemo, useState } from "react";
import type { RecommendResult } from "@warmrobot/core";
import type { ClothingDisplayMeta } from "@/legacy-wardrobe/lib/clothing-display";
import { nextVariant, pickDefaultRecommendation } from "@/lib/stitch-utils";
import { OutfitCard } from "@/legacy-wardrobe/components/outfit-card";
import { WhyThisWorks } from "@/components/stitch/why-this-works";

export function DashboardRecommendations({
  recommendations,
  initialVariant,
  itemMeta,
  activityLevel,
}: {
  recommendations: RecommendResult[];
  initialVariant: string;
  itemMeta: Record<string, ClothingDisplayMeta>;
  activityLevel: string;
}) {
  const [variant, setVariant] = useState(initialVariant);

  const recommendation = useMemo(() => {
    return (
      recommendations.find((r) => r.variant === variant) ??
      pickDefaultRecommendation(recommendations)
    );
  }, [recommendations, variant]);

  if (!recommendation || recommendation.pieces.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <h2 className="font-headline-md-mobile text-on-background">今日推荐</h2>
        <button
          type="button"
          onClick={() => setVariant(nextVariant(variant))}
          className="font-label-caps text-primary transition-opacity active:opacity-70"
        >
          换一套
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {recommendation.pieces.map((piece) => (
          <OutfitCard
            key={piece.item.id}
            piece={piece}
            meta={itemMeta[piece.item.id]}
            activityLevel={activityLevel}
          />
        ))}
      </div>
      <WhyThisWorks reason={recommendation.reason} />
    </section>
  );
}
