"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DbMaterial, DbSizeLabel, DbThickness } from "@/lib/db/types";
import { formatFetchErrorMessage } from "@/lib/fetch-error";
import { consumeWardrobeScanSession } from "@/legacy-wardrobe/lib/photo-recognize-session";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { ScanReviewItemCard } from "@/legacy-wardrobe/components/scan-review-item-card";
import type {
  WardrobeScanApiResponse,
  WardrobeScanItemDraft,
} from "@/legacy-wardrobe/lib/wardrobe-scan-types";
import {
  filterMaterialsForCategory,
  getCategoryFieldConfig,
} from "@/legacy-wardrobe/lib/clothing-enums";

const SCAN_TIPS = [
  "将衣物平铺在床面或桌面上，避免严重重叠",
  "衣架挂放、大量遮挡时识别率会明显下降，建议分批平铺拍摄",
  "光线充足、镜头正对，尽量拍全所有衣物",
  "颜色/款式差异明显的衣物更容易识别",
];

export function ScanWardrobeForm({
  materials,
  sizes,
  thicknesses,
  babyId,
  defaultSizeLabel,
}: {
  materials: DbMaterial[];
  sizes: DbSizeLabel[];
  thicknesses: DbThickness[];
  babyId?: string;
  defaultSizeLabel?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanElapsedSec, setScanElapsedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<WardrobeScanApiResponse | null>(null);
  const [items, setItems] = useState<WardrobeScanItemDraft[]>([]);
  const [bulkSizeLabel, setBulkSizeLabel] = useState(defaultSizeLabel ?? "");
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [fromAddPage, setFromAddPage] = useState(false);
  const sessionHydratedRef = useRef(false);

  useEffect(() => {
    if (sessionHydratedRef.current) return;
    sessionHydratedRef.current = true;

    const payload = consumeWardrobeScanSession();
    if (!payload) return;

    setScanResult(payload.scanResult);
    setItems(payload.scanResult.items);
    setPreviewUrl(payload.previewUrl);
    setFromAddPage(payload.fromAdd ?? false);
  }, []);

  function cancelScan() {
    abortRef.current?.abort();
    abortRef.current = null;
    setScanning(false);
    setScanElapsedSec(0);
    setError("已取消识别。云识别通常 10–30 秒，请稍后重试。");
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setError(null);
    setScanning(true);
    setScanElapsedSec(0);
    setScanResult(null);
    setItems([]);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const abortController = new AbortController();
    abortRef.current = abortController;
    const timer = window.setInterval(() => {
      setScanElapsedSec((sec) => sec + 1);
    }, 1000);

    try {
      const form = new FormData();
      form.append("image", file);

      const response = await fetch("/api/clothing/scan-wardrobe", {
        method: "POST",
        body: form,
        signal: abortController.signal,
      });
      const data = (await response.json()) as WardrobeScanApiResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "识别失败");

      setScanResult(data);
      setItems(data.items);
    } catch (scanError) {
      if (scanError instanceof Error && scanError.name === "AbortError") {
        return;
      }
      setError(
        scanError instanceof Error && scanError.name === "AbortError"
          ? null
          : formatFetchErrorMessage(scanError, "识别失败")
      );
    } finally {
      window.clearInterval(timer);
      abortRef.current = null;
      setScanning(false);
    }
  }

  function updateItem(tempId: string, next: WardrobeScanItemDraft) {
    setItems((current) => current.map((item) => (item.tempId === tempId ? next : item)));
  }

  function removeItem(tempId: string) {
    setItems((current) => current.filter((item) => item.tempId !== tempId));
  }

  function applyBulkSize() {
    if (!bulkSizeLabel) return;
    setItems((current) =>
      current.map((item) => {
        const fieldConfig = getCategoryFieldConfig(item.category);
        if (!fieldConfig.showSize) return item;
        return { ...item, sizeLabel: bulkSizeLabel };
      })
    );
  }

  function toggleSelectAll(selected: boolean) {
    setItems((current) => current.map((item) => ({ ...item, selected })));
  }

  async function handleSaveSelected() {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      setError("请至少勾选一件衣物");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        baby_id: babyId ?? null,
        scan_job_id: scanResult?.job_id ?? null,
        items: selectedItems.map((item) => {
          const fieldConfig = getCategoryFieldConfig(item.category);
          const filteredMaterials = filterMaterialsForCategory(materials, item.category);
          const materialId =
            item.materialId && filteredMaterials.some((m) => m.id === item.materialId)
              ? item.materialId
              : filteredMaterials[0]?.id;

          if (!materialId) {
            throw new Error(`${item.name}：缺少可用材质`);
          }

          return {
            name: item.name.trim(),
            category: item.category,
            material_id: materialId,
            thickness: item.thickness,
            size_label: fieldConfig.showSize ? item.sizeLabel : null,
            image_url: item.previewImageUrl,
            temp_id: item.tempId,
            source_metadata: {
              confidence: item.confidence,
              region_description: item.regionDescription,
              color_hint: item.colorHint,
              bounding_box: item.boundingBox,
              catalog_match: item.catalogMatch,
              field_sources: item.fieldSources,
              scan_image_url: scanResult?.scan_image_url ?? null,
            },
            fill_type: fieldConfig.showFillType ? "cotton_wadding" : null,
            sock_height: fieldConfig.showSockHeight ? "ankle" : null,
          };
        }),
      };

      const response = await fetch("/api/clothing/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");

      if (data.errors?.length) {
        setError(`已保存 ${data.created_count} 件，${data.errors.length} 件失败`);
      }

      router.push("/wardrobe");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/add"
          className="font-label-caps inline-flex items-center gap-1 text-primary"
        >
          <MaterialIcon name="arrow_back" className="text-[16px]" />
          返回添加页
        </Link>
        <h1 className="font-headline-md-mobile text-on-background">拍衣柜快速录入</h1>
        <p className="font-body-md text-on-surface-variant">
          拍一张照片，AI 识别多件衣物并预填类别与保暖属性，确认后批量入库。
          {fromAddPage && " 从添加页上传的衣柜照片已自动跳转至此处审核。"}
        </p>
      </header>

      <section className="rounded-2xl border border-surface-container-high bg-surface-container-low p-4">
        <h2 className="font-label-caps mb-3 text-on-surface-variant">拍摄建议</h2>
        <ul className="font-body-md space-y-2 text-[13px] text-on-surface-variant">
          {SCAN_TIPS.map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <MaterialIcon name="photo_camera" className="mt-0.5 shrink-0 text-primary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void handleFileChange(file);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="font-label-caps flex min-h-touch-target-min w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-on-primary transition-opacity disabled:opacity-60"
        >
          <MaterialIcon name="photo_camera" filled />
          {scanning ? `正在识别… ${scanElapsedSec}s` : "拍照 / 选择衣柜照片"}
        </button>

        {scanning && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary-fixed/30 p-4">
            <p className="font-body-md text-on-primary-fixed">
              AI 正在通过硅基流动分析照片，通常需要 <strong>10–30 秒</strong>，请保持页面打开。
            </p>
            <p className="font-label-caps text-[12px] text-on-primary-fixed/80">
              已等待 {scanElapsedSec} 秒
            </p>
            <button
              type="button"
              onClick={cancelScan}
              className="font-label-caps self-start rounded-full border border-outline px-4 py-2 text-on-surface-variant"
            >
              取消识别
            </button>
          </div>
        )}

        {previewUrl && (
          <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="衣柜预览"
              className="max-h-56 w-full object-cover"
            />
            {items.map((item) => {
              if (!item.boundingBox) return null;
              const isFocused = focusedItemId === item.tempId;
              const { x, y, w, h } = item.boundingBox;
              return (
                <div
                  key={item.tempId}
                  className={`pointer-events-none absolute border-2 ${
                    isFocused ? "border-primary bg-primary/20" : "border-on-primary-fixed/80"
                  }`}
                  style={{
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${w * 100}%`,
                    height: `${h * 100}%`,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {scanResult && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm-mobile text-on-background">
              识别到 {items.length} 件
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="font-label-caps rounded-full border border-surface-container-high px-3 py-1 text-primary"
              >
                全选
              </button>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="font-label-caps rounded-full border border-surface-container-high px-3 py-1 text-outline"
              >
                全不选
              </button>
            </div>
          </div>

          {scanResult.scene_notes && (
            <p className="font-body-md rounded-xl bg-primary-fixed px-4 py-3 text-on-primary-fixed">
              {scanResult.scene_notes}
            </p>
          )}

          {scanResult.warnings.length > 0 && (
            <ul className="font-body-md space-y-1 rounded-xl bg-secondary-container px-4 py-3 text-[12px] text-on-secondary-container">
              {scanResult.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border border-surface-container-high p-4">
            <label className="font-label-caps text-on-surface-variant">统一设置尺码</label>
            <div className="flex gap-2">
              <select
                className="font-body-md min-h-touch-target-min flex-1 rounded-full border border-surface-container-high bg-surface-container-lowest px-4 outline-none focus:border-primary"
                value={bulkSizeLabel}
                onChange={(event) => setBulkSizeLabel(event.target.value)}
              >
                <option value="">选择尺码...</option>
                {sizes.map((size) => (
                  <option key={size.code} value={size.code}>
                    {size.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkSize}
                disabled={!bulkSizeLabel}
                className="font-label-caps rounded-full border border-primary px-4 text-primary disabled:opacity-50"
              >
                应用
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div
                key={item.tempId}
                onMouseEnter={() => setFocusedItemId(item.tempId)}
                onMouseLeave={() => setFocusedItemId(null)}
                onFocus={() => setFocusedItemId(item.tempId)}
                onBlur={() => setFocusedItemId(null)}
              >
                <ScanReviewItemCard
                  item={item}
                  materials={materials}
                  sizes={sizes}
                  thicknesses={thicknesses}
                  onChange={(next) => updateItem(item.tempId, next)}
                  onRemove={() => removeItem(item.tempId)}
                />
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void handleSaveSelected()}
              disabled={saving || selectedCount === 0}
              className="font-label-caps sticky bottom-20 z-10 flex min-h-touch-target-min w-full items-center justify-center rounded-full bg-primary px-6 text-on-primary shadow-lg transition-opacity disabled:opacity-60"
            >
              {saving ? "保存中..." : `保存已选 ${selectedCount} 件至衣柜`}
            </button>
          )}
        </section>
      )}

      {error && (
        <div className="flex flex-col gap-2">
          <p className="rounded-xl bg-error-container px-4 py-3 font-body-md text-on-error-container">
            {error}
          </p>
          {fromAddPage && (
            <Link
              href="/add"
              className="font-label-caps inline-flex items-center gap-1 text-primary"
            >
              <MaterialIcon name="arrow_back" className="text-[16px]" />
              返回添加页重试
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
