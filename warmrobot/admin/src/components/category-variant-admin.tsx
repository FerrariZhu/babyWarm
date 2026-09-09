"use client";

import {
  CATEGORY_DISPLAY_LABELS_EN,
  getCategoryAxisOptions,
  summarizeCategoryAxisChips,
  type ClothingCategory,
  type CategoryGuideContent,
} from "@warmrobot/core/admin";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/app/admin/categories/actions";
import { createVariant } from "@/app/admin/variants/actions";
import { MaterialIcon } from "@/components/material-icon";
import { VariantAdminTable } from "@/components/variant-admin-table";
import { CategoryGuideAdminPanel } from "@/components/category-guide-admin-panel";
import {
  OUTFIT_SLOTS,
  outfitSlotLabel,
  type AdminCategory,
  type OutfitSlot,
} from "@/lib/admin/category-types";
import type { AdminVariant } from "@/lib/admin/variant-types";

type Props = {
  categories: AdminCategory[];
  variants: AdminVariant[];
  categoryGuides: CategoryGuideContent[];
  selectedCategoryCode?: string;
};

const emptyCategory = {
  code: "",
  name_zh: "",
  name_en: "",
  outfit_slot: "base_top" as OutfitSlot,
  warmth_min: 0,
  warmth_max: 100,
};

function defaultVariantForm(category: AdminCategory) {
  const spec = getCategoryAxisOptions(category.code);
  return {
    consumer_label: category.name_zh,
    consumer_label_en:
      CATEGORY_DISPLAY_LABELS_EN[category.code as ClothingCategory] ??
      category.name_en ??
      category.name_zh,
    material: spec?.materials?.[0] ?? null,
    fill_type: spec?.fillTypes?.[0] ?? null,
    thickness: spec?.thicknesses[0] ?? null,
    fit_type: spec?.fitTypes[0] ?? "regular",
    bodysuit_style: spec?.bodysuitStyles?.[0] ?? null,
    pant_length: spec?.pantLengths?.[0] ?? null,
    sock_height: spec?.sockHeights?.[0] ?? null,
    warmth_value: Math.round((category.warmth_min + category.warmth_max) / 2),
  };
}

export function CategoryVariantAdmin({
  categories: initialCategories,
  variants: initialVariants,
  categoryGuides,
  selectedCategoryCode,
}: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [variants, setVariants] = useState(initialVariants);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCategory);
  const [showCreateVariant, setShowCreateVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({
    consumer_label: "",
    consumer_label_en: "",
    material: null as string | null,
    fill_type: null as string | null,
    thickness: null as string | null,
    fit_type: "regular",
    bodysuit_style: null as string | null,
    pant_length: null as string | null,
    sock_height: null as string | null,
    warmth_value: 50,
  });

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  const selected = selectedCategoryCode
    ? categories.find((c) => c.code === selectedCategoryCode) ?? null
    : null;

  const axisChips = useMemo(
    () => (selected ? summarizeCategoryAxisChips(selected.code) : null),
    [selected]
  );

  const createAxisSpec = selected ? getCategoryAxisOptions(selected.code) : null;
  const selectedGuide = selected
    ? categoryGuides.find((guide) => guide.categoryCode === selected.code)
    : undefined;

  function goCategory(code?: string) {
    router.push(code ? `/admin/variants?category=${code}` : "/admin/variants");
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error-container/50 px-4 py-3 font-body-md text-on-error-container"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label-sm text-text-soft">
          {categories.length} 个品类 · {variants.length} 条细类型
          {pending ? " · 保存中…" : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowCreateCategory((v) => !v)}
          className="font-label-md inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-on-primary"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          新建品类
        </button>
      </div>

      {showCreateCategory && (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-sm">
          <h2 className="font-headline-md mb-3">新建品类</h2>
          <p className="font-body-md mb-3 text-text-soft">
            每个品类必须指定穿搭槽位；创建后会自动生成 1 条默认细类型，可继续补充。
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">code（创建后不可改）</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.code}
                placeholder="tshirt_short"
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">中文名称</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.name_zh}
                onChange={(e) => setCreateForm((f) => ({ ...f, name_zh: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">英文名称</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.name_en}
                onChange={(e) => setCreateForm((f) => ({ ...f, name_en: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">穿搭槽位（必填）</span>
              <select
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.outfit_slot}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    outfit_slot: e.target.value as OutfitSlot,
                  }))
                }
              >
                {OUTFIT_SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}（{s.value}）
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">参考区间 min</span>
              <input
                type="number"
                min={0}
                max={100}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.warmth_min}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, warmth_min: Number(e.target.value) }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">参考区间 max</span>
              <input
                type="number"
                min={0}
                max={100}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.warmth_max}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, warmth_max: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending}
              className="font-label-md rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await createCategory({
                    code: createForm.code,
                    name_zh: createForm.name_zh,
                    name_en: createForm.name_en || null,
                    outfit_slot: createForm.outfit_slot,
                    warmth_min: createForm.warmth_min,
                    warmth_max: createForm.warmth_max,
                    icon_key: "checkroom",
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setCategories((prev) => [...prev, result.data]);
                  setCreateForm(emptyCategory);
                  setShowCreateCategory(false);
                  goCategory(result.data.code);
                  router.refresh();
                });
              }}
            >
              创建
            </button>
            <button
              type="button"
              className="font-label-md rounded-lg border border-outline-variant px-4 py-2"
              onClick={() => setShowCreateCategory(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-label-sm text-text-soft">品类：</span>
        <button
          type="button"
          onClick={() => goCategory()}
          className={`rounded-lg border px-3 py-1.5 font-label-sm transition ${
            !selectedCategoryCode
              ? "border-primary bg-primary/10 text-primary"
              : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          全部（{variants.length}）
        </button>
        {categories.map((cat) => {
          const count = variants.filter((v) => v.category_code === cat.code).length;
          const active = selectedCategoryCode === cat.code;
          return (
            <button
              key={cat.code}
              type="button"
              onClick={() => goCategory(cat.code)}
              className={`rounded-lg border px-3 py-1.5 font-label-sm transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : cat.is_active
                    ? "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    : "border-outline-variant/40 text-text-soft opacity-60"
              }`}
              title={`${cat.code} · ${outfitSlotLabel(cat.outfit_slot)}`}
            >
              {cat.name_zh}
              <span className="ml-1 text-text-soft">
                ·{outfitSlotLabel(cat.outfit_slot)}（{count}）
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-headline-md text-on-background">{selected.name_zh}</h2>
              <p className="font-mono text-xs text-text-soft">{selected.code}</p>
            </div>
            <button
              type="button"
              disabled={pending}
              className={`font-label-md rounded-lg px-3 py-1.5 text-sm ${
                selected.is_active
                  ? "border border-outline-variant"
                  : "bg-secondary text-on-secondary"
              }`}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await updateCategory({
                    id: selected.id,
                    is_active: !selected.is_active,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setCategories((prev) =>
                    prev.map((c) => (c.id === selected.id ? result.data : c))
                  );
                });
              }}
            >
              {selected.is_active ? "下架品类" : "上架品类"}
            </button>
          </div>

          {axisChips ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {axisChips.materials.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-label-sm text-text-soft">材料：</span>
                  {axisChips.materials.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-on-surface-variant"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}
              {axisChips.fits.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-label-sm text-text-soft">版型：</span>
                  {axisChips.fits.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-on-surface-variant"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">中文名称</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                defaultValue={selected.name_zh}
                key={`${selected.id}-zh-${selected.name_zh}`}
                onBlur={(e) => {
                  const name_zh = e.target.value.trim();
                  if (!name_zh || name_zh === selected.name_zh) return;
                  setError(null);
                  startTransition(async () => {
                    const result = await updateCategory({ id: selected.id, name_zh });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setCategories((prev) =>
                      prev.map((c) => (c.id === selected.id ? result.data : c))
                    );
                  });
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">英文名称</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                defaultValue={selected.name_en ?? ""}
                key={`${selected.id}-en-${selected.name_en}`}
                onBlur={(e) => {
                  const name_en = e.target.value.trim() || null;
                  if (name_en === selected.name_en) return;
                  setError(null);
                  startTransition(async () => {
                    const result = await updateCategory({ id: selected.id, name_en });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setCategories((prev) =>
                      prev.map((c) => (c.id === selected.id ? result.data : c))
                    );
                  });
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">穿搭槽位（必填）</span>
              <select
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={selected.outfit_slot}
                onChange={(e) => {
                  const outfit_slot = e.target.value as OutfitSlot;
                  setError(null);
                  startTransition(async () => {
                    const result = await updateCategory({ id: selected.id, outfit_slot });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setCategories((prev) =>
                      prev.map((c) => (c.id === selected.id ? result.data : c))
                    );
                  });
                }}
              >
                {OUTFIT_SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}（{s.value}）
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                className="font-label-md inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3"
                onClick={() => {
                  setVariantForm(defaultVariantForm(selected));
                  setShowCreateVariant((v) => !v);
                }}
              >
                <MaterialIcon name="add" className="text-[18px]" />
                新建细类型
              </button>
            </div>
          </div>

          {showCreateVariant && (
            <div className="mt-4 grid gap-3 border-t border-outline-variant/40 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-text-soft">类型名称</span>
                <input
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                  value={variantForm.consumer_label}
                  onChange={(e) =>
                    setVariantForm((f) => ({ ...f, consumer_label: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-text-soft">类型英文名称</span>
                <input
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                  value={variantForm.consumer_label_en}
                  onChange={(e) =>
                    setVariantForm((f) => ({ ...f, consumer_label_en: e.target.value }))
                  }
                />
              </label>
              {createAxisSpec?.materials ? (
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-text-soft">材料</span>
                  <select
                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                    value={variantForm.material ?? ""}
                    onChange={(e) =>
                      setVariantForm((f) => ({ ...f, material: e.target.value || null }))
                    }
                  >
                    {createAxisSpec.materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {createAxisSpec && createAxisSpec.fitTypes.length > 0 ? (
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-text-soft">版型</span>
                  <select
                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                    value={variantForm.fit_type ?? "regular"}
                    onChange={(e) =>
                      setVariantForm((f) => ({ ...f, fit_type: e.target.value }))
                    }
                  >
                    {createAxisSpec.fitTypes.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {createAxisSpec && createAxisSpec.thicknesses.length > 1 ? (
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-text-soft">厚薄</span>
                  <select
                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                    value={variantForm.thickness ?? ""}
                    onChange={(e) =>
                      setVariantForm((f) => ({ ...f, thickness: e.target.value || null }))
                    }
                  >
                    {createAxisSpec.thicknesses.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-text-soft">保暖值</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2"
                  value={variantForm.warmth_value}
                  onChange={(e) =>
                    setVariantForm((f) => ({
                      ...f,
                      warmth_value: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="button"
                  disabled={pending}
                  className="font-label-md rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await createVariant({
                        category_id: selected.id,
                        category_code: selected.code,
                        consumer_label: variantForm.consumer_label,
                        consumer_label_en: variantForm.consumer_label_en,
                        material: variantForm.material,
                        fill_type: variantForm.fill_type,
                        thickness: variantForm.thickness,
                        fit_type: variantForm.fit_type,
                        bodysuit_style: variantForm.bodysuit_style,
                        pant_length: variantForm.pant_length,
                        sock_height: variantForm.sock_height,
                        warmth_value: variantForm.warmth_value,
                      });
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setVariants((prev) => [...prev, result.data]);
                      setShowCreateVariant(false);
                    });
                  }}
                >
                  添加细类型
                </button>
                <button
                  type="button"
                  className="font-label-md rounded-lg border border-outline-variant px-4 py-2"
                  onClick={() => setShowCreateVariant(false)}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected ? (
        <CategoryGuideAdminPanel
          categoryCode={selected.code}
          categoryName={selected.name_zh}
          initialGuide={selectedGuide}
        />
      ) : null}

      <VariantAdminTable
        initialVariants={variants}
        categoryCode={selectedCategoryCode}
        onVariantsChange={setVariants}
      />
    </div>
  );
}
