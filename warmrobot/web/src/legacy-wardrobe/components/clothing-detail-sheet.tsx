"use client";

import type { DbClothingItem, DbMaterial } from "@/lib/db/types";
import { LAYER_LABELS, THICKNESS_OPTIONS } from "@/lib/db/types";
import { getCategoryLabel, getCategoryLayerOrder } from "@/lib/clothing-categories";
import { FIT_TYPE_OPTIONS } from "@/lib/clothing-weight";
import {
  breathabilityBadgeLabel,
  breathabilityLabel,
  resolveBreathability,
  seasonBadgeClass,
  seasonBadgeLabel,
  togEquivalent,
  warmthIndexLabel,
} from "@/legacy-wardrobe/lib/clothing-display";
import { MaterialIcon } from "@/components/stitch/material-icon";

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-surface-container-high py-3 last:border-b-0">
      <span className="font-label-caps shrink-0 text-on-surface-variant">{label}</span>
      <span className="font-body-md text-right text-on-surface">{value}</span>
    </div>
  );
}

function resolveMaterialName(materialId: string | null | undefined, materials: DbMaterial[]): string | null {
  if (!materialId) return null;
  return materials.find((m) => m.id === materialId)?.name ?? null;
}

function resolveThicknessLabel(thickness: DbClothingItem["thickness"]): string | null {
  if (!thickness) return null;
  return THICKNESS_OPTIONS.find((option) => option.value === thickness)?.label ?? thickness;
}

function resolveFitLabel(fitType: DbClothingItem["fit_type"]): string | null {
  if (!fitType) return null;
  return FIT_TYPE_OPTIONS.find((option) => option.value === fitType)?.label ?? fitType;
}

export function ClothingDetailSheet({
  item,
  materials,
  onClose,
}: {
  item: DbClothingItem;
  materials: DbMaterial[];
  onClose: () => void;
}) {
  const season = seasonBadgeLabel(item.season_tags);
  const breathability = resolveBreathability({
    category: item.category,
    thickness: item.thickness,
    breathability: item.breathability,
  });
  const layerOrder = getCategoryLayerOrder(item.category);
  const layerLabel = LAYER_LABELS[layerOrder] ?? null;
  const warmthScore = Number(item.warmth_score);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/40 backdrop-blur-sm md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clothing-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface-container-lowest pb-24 cloud-shadow md:rounded-2xl md:pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-container-high bg-surface-container-lowest/95 px-4 py-3 backdrop-blur-sm">
          <h2 id="clothing-detail-title" className="font-headline-md-mobile text-on-surface">
            衣物详情
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container-high"
            aria-label="关闭"
          >
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div className="aspect-square w-full bg-[#F4F7F5]">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-contain p-6"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MaterialIcon name="laundry" className="text-[72px] text-primary/30" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {item.is_favorite && (
                <span className="font-label-caps inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-1 text-[10px] text-on-error-container">
                  <MaterialIcon name="favorite" className="text-[12px]" filled />
                  收藏
                </span>
              )}
              {season && (
                <span
                  className={`font-label-caps rounded-full px-2 py-1 text-[10px] ${seasonBadgeClass(season)}`}
                >
                  {season}
                </span>
              )}
              {!item.is_available && (
                <span className="font-label-caps rounded-full bg-surface-container-high px-2 py-1 text-[10px] text-outline">
                  不可用
                </span>
              )}
            </div>
            <h3 className="font-headline-md-mobile text-on-surface">{item.name}</h3>
            <p className="font-body-md mt-1 text-on-surface-variant">{getCategoryLabel(item.category)}</p>
          </div>

          <div className="rounded-2xl bg-primary-fixed px-4 py-3">
            <div className="flex items-center gap-2 text-on-primary-fixed">
              <MaterialIcon name="device_thermostat" className="text-[20px]" />
              <span className="font-body-md">{warmthIndexLabel(warmthScore)}</span>
            </div>
            <p className="font-body-md mt-1 text-[12px] text-on-primary-fixed/80">
              约 {togEquivalent(warmthScore)} TOG · {breathabilityBadgeLabel(breathability)}（透气
              {breathabilityLabel(breathability)}）
            </p>
          </div>

          <div className="rounded-2xl bg-surface-container-low px-4">
            <DetailRow label="尺码" value={item.size_label ? `${item.size_label} 码` : null} />
            <DetailRow label="厚度" value={resolveThicknessLabel(item.thickness)} />
            <DetailRow label="材质" value={resolveMaterialName(item.material_id, materials)} />
            <DetailRow label="版型" value={resolveFitLabel(item.fit_type)} />
            <DetailRow label="穿搭层级" value={layerLabel} />
            <DetailRow
              label="重量"
              value={item.weight_grams != null ? `${Math.round(item.weight_grams)} 克` : null}
            />
            <DetailRow label="季节" value={season} />
          </div>
        </div>
      </div>
    </div>
  );
}
