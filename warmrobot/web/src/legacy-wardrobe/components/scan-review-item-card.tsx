"use client";

import type { DbMaterial, DbSizeLabel, DbThickness } from "@/lib/db/types";
import { getCategoryLabel } from "@/lib/clothing-categories";
import {
  filterMaterialsForCategory,
  filterSizesForCategory,
  filterThicknessesForCategory,
  getCategoryFieldConfig,
} from "@/legacy-wardrobe/lib/clothing-enums";
import { MaterialIcon } from "@/components/stitch/material-icon";
import type { WardrobeScanItemDraft } from "@/legacy-wardrobe/lib/wardrobe-scan-types";
import { CLOTHING_CATEGORY_GROUPS } from "@/lib/clothing-categories";

function confidenceLabel(confidence: number): { text: string; className: string } {
  if (confidence >= 0.85) {
    return { text: "高", className: "bg-tertiary-container text-on-tertiary-container" };
  }
  if (confidence >= 0.65) {
    return { text: "中", className: "bg-secondary-container text-on-secondary-container" };
  }
  return { text: "低", className: "bg-error-container text-on-error-container" };
}

function fieldSourceLabel(source: "vision" | "catalog"): string {
  return source === "catalog" ? "商品库" : "AI";
}

export function ScanReviewItemCard({
  item,
  materials,
  sizes,
  thicknesses,
  onChange,
  onRemove,
}: {
  item: WardrobeScanItemDraft;
  materials: DbMaterial[];
  sizes: DbSizeLabel[];
  thicknesses: DbThickness[];
  onChange: (next: WardrobeScanItemDraft) => void;
  onRemove: () => void;
}) {
  const fieldConfig = getCategoryFieldConfig(item.category);
  const filteredMaterials = filterMaterialsForCategory(materials, item.category);
  const filteredSizes = filterSizesForCategory(sizes, item.category);
  const filteredThicknesses = filterThicknessesForCategory(thicknesses, item.category);
  const confidence = confidenceLabel(item.confidence);

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        item.confidence < 0.65
          ? "border-error bg-error-container/20"
          : item.selected
            ? "border-primary bg-surface-container-lowest"
            : "border-surface-container-high bg-surface-container-low opacity-70"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <label className="flex min-h-touch-target-min items-center gap-3">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(event) => onChange({ ...item, selected: event.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-label-caps text-on-surface-variant">保存此件</span>
        </label>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 font-label-caps text-[10px] ${confidence.className}`}>
            置信度 {confidence.text} {Math.round(item.confidence * 100)}%
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-container-high"
            aria-label="移除此件"
          >
            <MaterialIcon name="close" className="text-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {item.previewImageUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#F4F7F5] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewImageUrl}
              alt={item.name}
              className="h-24 w-24 shrink-0 rounded-lg object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <p className="font-label-caps text-[10px] text-on-surface-variant">抠图预览</p>
              <p className="font-body-md text-[12px] text-outline">保存后将显示在衣柜卡片中</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label className="font-label-caps ml-1 text-on-surface-variant">名称</label>
          <input
            className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-4 text-on-background outline-none focus:border-primary"
            value={item.name}
            onChange={(event) => onChange({ ...item, name: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-caps ml-1 text-on-surface-variant">
            类别
            <span className="ml-1 text-[10px] text-outline">
              ({fieldSourceLabel(item.fieldSources.category)})
            </span>
          </label>
          <select
            className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-4 text-on-background outline-none focus:border-primary"
            value={item.category}
            onChange={(event) => {
              const newCategory = event.target.value as WardrobeScanItemDraft["category"];
              const nextMaterials = filterMaterialsForCategory(materials, newCategory);
              onChange({
                ...item,
                category: newCategory,
                materialId: nextMaterials[0]?.id ?? item.materialId,
              });
            }}
          >
            {CLOTHING_CATEGORY_GROUPS.flatMap((group) =>
              group.items.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {group.label} · {cat.label}
                </option>
              ))
            )}
          </select>
        </div>

        {fieldConfig.showMaterial && filteredMaterials.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="font-label-caps ml-1 text-on-surface-variant">
              材质
              <span className="ml-1 text-[10px] text-outline">
                ({fieldSourceLabel(item.fieldSources.material)})
              </span>
            </label>
            <select
              className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-4 text-on-background outline-none focus:border-primary"
              value={item.materialId ?? ""}
              onChange={(event) => onChange({ ...item, materialId: event.target.value })}
            >
              {filteredMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {fieldConfig.showThickness && filteredThicknesses.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="font-label-caps ml-1 text-on-surface-variant">
              厚度
              <span className="ml-1 text-[10px] text-outline">
                ({fieldSourceLabel(item.fieldSources.thickness)})
              </span>
            </label>
            <select
              className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-4 text-on-background outline-none focus:border-primary"
              value={item.thickness}
              onChange={(event) =>
                onChange({
                  ...item,
                  thickness: event.target.value as WardrobeScanItemDraft["thickness"],
                })
              }
            >
              {filteredThicknesses.map((thickness) => (
                <option key={thickness.code} value={thickness.code}>
                  {thickness.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {fieldConfig.showSize && filteredSizes.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="font-label-caps ml-1 text-on-surface-variant">尺码</label>
            <select
              className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-4 text-on-background outline-none focus:border-primary"
              value={item.sizeLabel ?? ""}
              onChange={(event) =>
                onChange({ ...item, sizeLabel: event.target.value || null })
              }
            >
              <option value="">不指定</option>
              {filteredSizes.map((size) => (
                <option key={size.code} value={size.code}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.regionDescription && (
          <p className="font-body-md text-[12px] text-outline">
            位置：{item.regionDescription}
            {item.colorHint ? ` · ${item.colorHint}` : ""}
          </p>
        )}

        {item.catalogMatch && (
          <div className="flex items-start gap-3 rounded-xl bg-primary-fixed p-3">
            {item.catalogMatch.picUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.catalogMatch.picUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
                <MaterialIcon name="checkroom" className="text-outline" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-label-caps text-[10px] text-on-primary-fixed">
                参考商品 · 相似度 {Math.round(item.catalogMatch.similarity * 100)}%
              </p>
              <p className="font-body-md line-clamp-2 text-[12px] text-on-primary-fixed">
                {item.catalogMatch.title}
              </p>
            </div>
          </div>
        )}

        {item.warnings.length > 0 && (
          <ul className="font-body-md list-disc space-y-0.5 pl-4 text-[11px] text-outline">
            {item.warnings.slice(0, 2).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <p className="font-label-caps text-[10px] text-outline">
          当前类别：{getCategoryLabel(item.category)}
        </p>
      </div>
    </article>
  );
}
