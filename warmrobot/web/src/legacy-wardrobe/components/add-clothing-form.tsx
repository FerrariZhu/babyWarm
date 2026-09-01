"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClothingCategory } from "@warmrobot/core";
import type { DbMaterial, DbSizeLabel, DbThickness } from "@/lib/db/types";
import { getCategoryLabel, isClothingCategory } from "@/lib/clothing-categories";
import {
  FILL_TYPE_OPTIONS,
  SOCK_HEIGHT_OPTIONS,
  type BodysuitStyle,
  type FillType,
  type PantLength,
  type SockHeight,
} from "@/legacy-wardrobe/lib/clothing-enums";
import { type ClothingFitType } from "@/lib/clothing-weight";
import {
  buildClothingCreatePayload,
  validateClothingFormFields,
} from "@/legacy-wardrobe/lib/clothing-validation";
import { togEquivalent } from "@/legacy-wardrobe/lib/clothing-display";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { OptionChips } from "@/components/stitch/option-chips";
import { SizePicker } from "@/legacy-wardrobe/components/size-picker";
import { useClothingFormState } from "@/legacy-wardrobe/hooks/use-clothing-form-state";
import { useProductParse, type PhotoDisambiguation } from "@/legacy-wardrobe/hooks/use-product-parse";
import { useWarmthPreview } from "@/legacy-wardrobe/hooks/use-warmth-preview";
import type { BabySizeProfile } from "@/lib/suggest-size";

export function AddClothingForm({
  materials,
  sizes,
  thicknesses,
  babyId,
  babyProfile,
  initialCategory = null,
}: {
  materials: DbMaterial[];
  sizes: DbSizeLabel[];
  thicknesses: DbThickness[];
  babyId?: string;
  babyProfile?: BabySizeProfile;
  initialCategory?: ClothingCategory | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useClothingFormState({
    materials,
    sizes,
    thicknesses,
    babyProfile,
    initialCategory,
  });

  const {
    warmthPreview,
    estimatedWeightGrams,
    warmthPreviewLoading,
    warmthPreviewError,
    refreshWarmthPreview,
  } = useWarmthPreview({
    category: form.category,
    materialId: form.materialId,
    thickness: form.thickness,
    sizeLabel: form.sizeLabel,
    fitType: form.fitType,
    participatesInWarmth: form.fieldConfig.participatesInWarmth,
  });

  const productParse = useProductParse({
    url,
    sizes,
    form,
    refreshWarmthPreview,
    onError: (message) => setError(message || null),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateClothingFormFields({
      name: form.name,
      category: form.category,
      materialId: form.materialId,
      fillType: form.fillType,
      sockHeight: form.sockHeight,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = buildClothingCreatePayload({
        name: form.name,
        category: form.category,
        materialId: form.materialId,
        thickness: form.thickness,
        sizeLabel: form.sizeLabel,
        fitType: form.fitType,
        fillType: form.fillType,
        bodysuitStyle: form.bodysuitStyle,
        pantLength: form.pantLength,
        sockHeight: form.sockHeight,
        estimatedWeightGrams,
        babyId,
        canonicalSourceUrl: productParse.canonicalSourceUrl,
        url,
        imageUrl: productParse.imageUrl,
        parseMetadata: productParse.parseMetadata,
        parseJobId: productParse.parseJobId,
      });

      const response = await fetch("/api/clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");

      router.push(`/add/success?id=${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <QuickAddSection
        url={url}
        parsing={productParse.parsing}
        parseStatus={productParse.parseStatus}
        parseNotice={productParse.parseNotice}
        screenshotPreview={productParse.screenshotPreview}
        parsedImageUrl={productParse.imageUrl}
        photoDisambiguation={productParse.photoDisambiguation}
        screenshotInputRef={productParse.screenshotInputRef}
        onUrlChange={setUrl}
        onParseUrl={() => void productParse.handleParseUrl()}
        onPhotoChange={(file) => void productParse.handlePhotoChange(file)}
        onDisambiguationChoice={(scene) =>
          void productParse.handleDisambiguationChoice(scene)
        }
        onCancelDisambiguation={productParse.cancelPhotoDisambiguation}
      />

      <div className="flex w-full items-center gap-4">
        <div className="h-px flex-1 bg-surface-container-high" />
        <span className="font-label-caps text-outline-variant">或</span>
        <div className="h-px flex-1 bg-surface-container-high" />
      </div>

      <section className="flex flex-col gap-4 pb-4">
        <h2 className="font-headline-md-mobile text-on-background">手动录入</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps ml-2 text-on-surface-variant">衣服名称</label>
              <input
                className="font-body-md min-h-touch-target-min w-full rounded-full border border-surface-container-high bg-surface-container-lowest px-6 text-on-background input-sunken outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
                value={form.name}
                onChange={(event) => form.setName(event.target.value)}
                placeholder="商品标题"
                required
              />
            </div>

            <CategoryFieldLink value={form.category} />

            {!isClothingCategory(form.category) && (
              <p className="font-body-md ml-2 text-[12px] leading-snug text-outline">
                请先选择类别，系统将展示该类别对应的尺码、材质等选项。
              </p>
            )}

            {isClothingCategory(form.category) && !form.fieldConfig.showSize && (
              <p className="font-body-md ml-2 text-[12px] text-outline">此类别无需选择尺码。</p>
            )}

            {form.fieldConfig.showSize && form.filteredSizes.length > 0 && (
              <SizePicker
                sizes={sizes}
                category={form.category}
                value={form.sizeLabel}
                onChange={(value) => {
                  form.markSizeManuallySet();
                  form.setSizeLabel(value);
                  void refreshWarmthPreview({ sizeLabel: value });
                }}
              />
            )}

            {form.fieldConfig.showBodysuitStyle && form.bodysuitStyleOptions.length > 0 && (
              <OptionChips<BodysuitStyle>
                label="款式"
                value={form.bodysuitStyle || form.bodysuitStyleOptions[0].value}
                options={form.bodysuitStyleOptions}
                onChange={form.setBodysuitStyle}
              />
            )}

            {form.fieldConfig.showMaterial && form.filteredMaterials.length > 0 && (
              <FieldSelect
                label="材质"
                value={form.materialId}
                onChange={(value) => {
                  form.setMaterialId(value);
                  void refreshWarmthPreview({ materialId: value });
                }}
                placeholder="选择材质..."
                options={form.filteredMaterials.map((material) => ({
                  value: material.id,
                  label: material.name,
                }))}
              />
            )}

            {form.fieldConfig.showFillType && (
              <OptionChips<FillType>
                label="填充物"
                value={form.fillType || FILL_TYPE_OPTIONS[0].value}
                options={FILL_TYPE_OPTIONS}
                onChange={form.setFillType}
              />
            )}

            {form.fieldConfig.showThickness && form.filteredThicknesses.length > 0 && (
              <FieldSelect
                label="厚度"
                value={form.thickness}
                onChange={(value) => {
                  form.setThickness(value);
                  void refreshWarmthPreview({ thickness: value });
                }}
                placeholder="选择厚度..."
                options={form.filteredThicknesses.map((option) => ({
                  value: option.code,
                  label: option.label,
                }))}
              />
            )}

            {form.fieldConfig.showPantLength && form.pantLengthOptions.length > 0 && (
              <OptionChips<PantLength>
                label="裤长"
                value={form.pantLength || form.pantLengthOptions[0].value}
                options={form.pantLengthOptions}
                onChange={form.setPantLength}
              />
            )}

            {form.fieldConfig.showSockHeight && (
              <OptionChips<SockHeight>
                label="袜筒"
                value={form.sockHeight || SOCK_HEIGHT_OPTIONS[0].value}
                options={SOCK_HEIGHT_OPTIONS}
                onChange={form.setSockHeight}
              />
            )}

            {form.fieldConfig.showFit && form.fitOptions.length > 0 && (
              <OptionChips<ClothingFitType>
                label="版型"
                value={form.fitType}
                options={form.fitOptions}
                onChange={(value) => {
                  form.setFitType(value);
                  void refreshWarmthPreview({ fitType: value });
                }}
              />
            )}
          </div>

          {form.fieldConfig.participatesInWarmth && (
            <WarmthPreviewCard
              warmthPreview={warmthPreview}
              warmthPreviewLoading={warmthPreviewLoading}
              warmthPreviewError={warmthPreviewError}
              estimatedWeightGrams={estimatedWeightGrams}
            />
          )}

          {error && (
            <p className="rounded-xl bg-secondary-fixed px-4 py-3 font-body-md text-on-secondary-fixed">
              {error}
            </p>
          )}

          <div className="h-24 md:hidden" aria-hidden />

          <div className="fixed inset-x-0 bottom-[88px] z-40 mx-auto max-w-md px-margin-mobile md:static md:inset-auto md:mt-6 md:px-0">
            <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-2 md:bg-none md:p-0">
              <button
                type="submit"
                disabled={saving}
                className="font-label-caps flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-primary tracking-wider text-on-primary uppercase shadow-[0_8px_24px_rgba(62,102,88,0.25)] transition-all hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
              >
                <MaterialIcon name="add" />
                {saving ? "保存中…" : "保存至衣柜"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}

function QuickAddSection({
  url,
  parsing,
  parseStatus,
  parseNotice,
  screenshotPreview,
  parsedImageUrl,
  photoDisambiguation,
  screenshotInputRef,
  onUrlChange,
  onParseUrl,
  onPhotoChange,
  onDisambiguationChoice,
  onCancelDisambiguation,
}: {
  url: string;
  parsing: boolean;
  parseStatus: string | null;
  parseNotice: string | null;
  screenshotPreview: string | null;
  parsedImageUrl: string | null;
  photoDisambiguation: PhotoDisambiguation | null;
  screenshotInputRef: React.RefObject<HTMLInputElement | null>;
  onUrlChange: (value: string) => void;
  onParseUrl: () => void;
  onPhotoChange: (file: File | null) => void;
  onDisambiguationChoice: (scene: "product_screenshot" | "physical_wardrobe") => void;
  onCancelDisambiguation: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-headline-md-mobile text-on-background">快速添加</h2>
      <div className="flex flex-col gap-4 rounded-xl border border-surface-container-high bg-surface-container-lowest p-6 cloud-shadow">
        <p className="font-body-md text-on-surface-variant">
          已支持万邦商品 API：粘贴淘宝/天猫链接即可解析。也可粘贴带「商品名」的分享文案，或拍照/选图识别（商品页截图单件预填，衣柜/平铺照片多件识别；需配置硅基流动等云视觉模型）。
        </p>
        <div className="flex flex-col gap-4">
          <textarea
            className="font-body-md min-h-[88px] w-full resize-y rounded-2xl border border-surface-container-high bg-surface-bright px-6 py-4 text-on-background input-sunken transition-colors outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="粘贴链接，或淘宝分享整段文案（推荐，可带上商品名）"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            rows={3}
          />
          <button
            type="button"
            onClick={onParseUrl}
            disabled={parsing}
            className="font-label-caps flex min-h-touch-target-min w-full items-center justify-center gap-2 rounded-full bg-secondary px-8 tracking-wider text-on-secondary uppercase cloud-shadow transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {parsing ? (
              <>
                <MaterialIcon name="sync" className="animate-spin" />
                正在解析...
              </>
            ) : (
              <>
                <MaterialIcon name="auto_awesome" filled />
                解析链接
              </>
            )}
          </button>

          <div className="flex flex-col gap-3 border-t border-surface-container-high pt-4">
            <p className="font-label-caps text-on-surface-variant">或拍照 / 选图识别</p>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onPhotoChange(file);
                event.target.value = "";
              }}
            />
            {parsedImageUrl ? (
              <div className="rounded-xl bg-[#F4F7F5] p-3">
                <p className="font-label-caps mb-2 text-[10px] text-on-surface-variant">抠图预览</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={parsedImageUrl}
                  alt="商品抠图预览"
                  className="mx-auto max-h-40 w-full rounded-lg object-contain"
                />
              </div>
            ) : screenshotPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshotPreview}
                alt="照片预览"
                className="max-h-40 w-full rounded-xl object-contain bg-surface-container-low"
              />
            ) : null}
            <button
              type="button"
              disabled={parsing}
              onClick={() => screenshotInputRef.current?.click()}
              className="font-label-caps flex min-h-touch-target-min w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-surface-container-lowest px-8 text-primary transition-all hover:bg-primary-fixed active:scale-95 disabled:opacity-60"
            >
              <MaterialIcon name="photo_camera" />
              {parsing ? (parseStatus ?? "识别中…") : "拍照 / 选图识别"}
            </button>
            <p className="font-body-md text-center text-[12px] text-on-surface-variant">
              <Link href="/add/scan" className="text-primary underline-offset-2 hover:underline">
                已知是衣柜照片？直接多件识别 →
              </Link>
            </p>

            {photoDisambiguation && (
              <div className="flex flex-col gap-3 rounded-xl border border-secondary-container bg-secondary-container/30 p-4">
                <p className="font-body-md text-on-secondary-container">
                  请选择照片类型：
                </p>
                {photoDisambiguation.hints.length > 0 && (
                  <ul className="font-body-md space-y-1 text-[12px] text-on-surface-variant">
                    {photoDisambiguation.hints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={parsing}
                    onClick={() => onDisambiguationChoice("product_screenshot")}
                    className="font-label-caps flex min-h-touch-target-min flex-1 items-center justify-center gap-2 rounded-full bg-secondary px-4 text-on-secondary disabled:opacity-60"
                  >
                    <MaterialIcon name="shopping_bag" />
                    商品页截图
                  </button>
                  <button
                    type="button"
                    disabled={parsing}
                    onClick={() => onDisambiguationChoice("physical_wardrobe")}
                    className="font-label-caps flex min-h-touch-target-min flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary px-4 text-primary disabled:opacity-60"
                  >
                    <MaterialIcon name="checkroom" />
                    衣柜照片
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onCancelDisambiguation}
                  className="font-label-caps self-start text-outline"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {parseNotice && (
            <p className="rounded-xl bg-primary-fixed px-4 py-3 font-body-md text-on-primary-fixed">
              {parseNotice}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function WarmthPreviewCard({
  warmthPreview,
  warmthPreviewLoading,
  warmthPreviewError,
  estimatedWeightGrams,
}: {
  warmthPreview: number | null;
  warmthPreviewLoading: boolean;
  warmthPreviewError: string | null;
  estimatedWeightGrams: number | null;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-primary-fixed-dim bg-primary-container p-5 transition-all duration-300 ${warmthPreview !== null ? "scale-[1.02]" : ""}`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-label-caps uppercase text-on-primary-container">预测保暖值</span>
        <div className="flex items-end gap-2">
          <span className="font-data-heavy text-3xl text-on-primary-container">
            {warmthPreviewLoading
              ? "…"
              : warmthPreview !== null
                ? togEquivalent(warmthPreview)
                : "—"}
          </span>
          <span className="font-label-caps mb-1 opacity-80 text-on-primary-container">
            TOG 等效值
          </span>
        </div>
        {warmthPreview !== null && !warmthPreviewLoading && (
          <span className="font-label-caps text-[10px] opacity-70 text-on-primary-container">
            保暖指数 {Math.round(warmthPreview)}
          </span>
        )}
        {estimatedWeightGrams != null && !warmthPreviewLoading && (
          <span className="font-label-caps text-[10px] opacity-70 text-on-primary-container">
            估算重量约 {estimatedWeightGrams} g
          </span>
        )}
        {warmthPreviewError && (
          <span className="font-body-md text-[12px] text-on-secondary-fixed">{warmthPreviewError}</span>
        )}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
        <MaterialIcon name="thermostat" filled className="text-on-primary" />
      </div>
    </div>
  );
}

function CategoryFieldLink({ value }: { value: string }) {
  const label = value ? getCategoryLabel(value) : null;
  const href = value
    ? `/add/category?current=${encodeURIComponent(value)}`
    : "/add/category";

  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-caps ml-2 text-on-surface-variant">类别</label>
      <Link
        href={href}
        className="font-body-md flex min-h-touch-target-min w-full items-center justify-between rounded-full border border-surface-container-high bg-surface-container-lowest px-6 text-on-background input-sunken transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
      >
        <span className={label ? "" : "text-outline"}>{label ?? "选择类别..."}</span>
        <MaterialIcon name="chevron_right" className="text-outline" />
      </Link>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-caps ml-2 text-on-surface-variant">{label}</label>
      <div className="relative">
        <select
          className="font-body-md min-h-touch-target-min w-full appearance-none rounded-full border border-surface-container-high bg-surface-container-lowest px-6 pr-12 text-on-background input-sunken outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <MaterialIcon
          name="expand_more"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-outline"
        />
      </div>
    </div>
  );
}
