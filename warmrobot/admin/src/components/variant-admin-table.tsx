"use client";

import {
  bodysuitStyleLabelZh,
  fillTypeLabelZh,
  fitOptionLabelZh,
  getCategoryAxisOptions,
  getCategoryAxisSpec,
  hatKindLabelZh,
  materialOptionLabelZh,
  pantLengthLabelZh,
  sockHeightLabelZh,
  thicknessOptionLabelZh,
} from "@warmrobot/core/admin";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { updateVariant } from "@/app/admin/variants/actions";
import type { AdminVariant, UpdateVariantInput } from "@/lib/admin/variant-types";

type Props = {
  initialVariants: AdminVariant[];
  categoryCode?: string;
  onVariantsChange?: (variants: AdminVariant[]) => void;
};

function AxisSelect({
  value,
  options,
  labelFn,
  disabled,
  onChange,
}: {
  value: string | null;
  options: readonly string[];
  labelFn: (v: string) => string;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  if (options.length === 0) {
    return <span className="text-text-soft">—</span>;
  }
  if (options.length === 1 && !disabled) {
    return <span className="font-body-md text-sm">{labelFn(options[0]!)}</span>;
  }
  return (
    <select
      className="w-full min-w-[5rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-sm disabled:opacity-60"
      value={value ?? options[0] ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labelFn(opt)}
        </option>
      ))}
    </select>
  );
}

type AxisField = {
  key: keyof UpdateVariantInput | "hat_kind";
  label: string;
  options: readonly string[];
  labelFn: (v: string) => string;
};

function axisFieldsForCategory(categoryCode: string | undefined): AxisField[] {
  if (!categoryCode) return [];
  const spec = getCategoryAxisOptions(categoryCode);
  const raw = getCategoryAxisSpec(categoryCode);
  if (!spec) return [];

  const fields: AxisField[] = [];

  if (spec.thicknesses.length > 1) {
    fields.push({
      key: "thickness",
      label: "厚薄",
      options: spec.thicknesses,
      labelFn: (v) => thicknessOptionLabelZh(v as Parameters<typeof thicknessOptionLabelZh>[0]),
    });
  }
  if (raw?.hatKinds && raw.hatKinds.length > 0) {
    fields.push({
      key: "hat_kind",
      label: "帽型",
      options: raw.hatKinds,
      labelFn: (v) => hatKindLabelZh(v) ?? v,
    });
  }
  if (spec.fillTypes && spec.fillTypes.length > 0) {
    fields.push({
      key: "fill_type",
      label: "填充",
      options: spec.fillTypes,
      labelFn: (v) => fillTypeLabelZh(v) ?? v,
    });
  }
  if (spec.bodysuitStyles && spec.bodysuitStyles.length > 0) {
    fields.push({
      key: "bodysuit_style",
      label: "包屁衣款式",
      options: spec.bodysuitStyles,
      labelFn: (v) => bodysuitStyleLabelZh(v) ?? v,
    });
  }
  if (spec.pantLengths && spec.pantLengths.length > 0) {
    fields.push({
      key: "pant_length",
      label: "裤长",
      options: spec.pantLengths,
      labelFn: (v) => pantLengthLabelZh(v) ?? v,
    });
  }
  if (spec.sockHeights && spec.sockHeights.length > 0) {
    fields.push({
      key: "sock_height",
      label: "袜筒",
      options: spec.sockHeights,
      labelFn: (v) => sockHeightLabelZh(v) ?? v,
    });
  }

  return fields;
}

/** Stable column order for the「全部」view header. */
const ALL_AXIS_FIELD_META: { key: AxisField["key"]; label: string }[] = [
  { key: "thickness", label: "厚薄" },
  { key: "hat_kind", label: "帽型" },
  { key: "fill_type", label: "填充" },
  { key: "bodysuit_style", label: "包屁衣款式" },
  { key: "pant_length", label: "裤长" },
  { key: "sock_height", label: "袜筒" },
];

function axisColumnsForAllView(variants: AdminVariant[]): AxisField[] {
  const keysNeeded = new Set<AxisField["key"]>();
  for (const v of variants) {
    for (const field of axisFieldsForCategory(v.category_code)) {
      keysNeeded.add(field.key);
    }
  }
  return ALL_AXIS_FIELD_META.filter(({ key }) => keysNeeded.has(key)).map(({ key, label }) => ({
    key,
    label,
    options: [],
    labelFn: (v: string) => v,
  }));
}

function rowAxisFieldMap(categoryCode: string): Map<AxisField["key"], AxisField> {
  return new Map(axisFieldsForCategory(categoryCode).map((f) => [f.key, f]));
}

function axisValue(v: AdminVariant, key: AxisField["key"]): string | null {
  if (key === "hat_kind") return v.hat_kind ?? null;
  return v[key as keyof AdminVariant] as string | null;
}

export function VariantAdminTable({
  initialVariants,
  categoryCode,
  onVariantsChange,
}: Props) {
  const [variants, setVariants] = useState(initialVariants);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const axisSpec = useMemo(
    () => (categoryCode ? getCategoryAxisOptions(categoryCode) : null),
    [categoryCode]
  );

  const displayVariants = categoryCode
    ? variants.filter((v) => v.category_code === categoryCode)
    : variants;

  const axisColumns = useMemo(() => {
    if (categoryCode) return axisFieldsForCategory(categoryCode);
    return axisColumnsForAllView(displayVariants);
  }, [categoryCode, displayVariants]);

  const baseColCount = 7;
  const colCount = baseColCount + axisColumns.length;

  const materialOptions = axisSpec?.materials ?? [];
  const fitOptions = axisSpec?.fitTypes ?? [];

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  function setAll(next: AdminVariant[] | ((prev: AdminVariant[]) => AdminVariant[])) {
    setVariants((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      onVariantsChange?.(resolved);
      return resolved;
    });
  }

  function patchLocal(id: string, patch: Partial<AdminVariant>) {
    setAll((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function saveField(id: string, patch: Omit<UpdateVariantInput, "id">) {
    setError(null);
    startTransition(async () => {
      const result = await updateVariant({ ...patch, id });
      if (!result.ok) {
        setError(result.error ?? "操作失败");
        return;
      }
      setAll((prev) => prev.map((v) => (v.id === id ? result.data : v)));
    });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error-container/50 px-4 py-3 font-body-md text-on-error-container"
        >
          {error}
        </div>
      )}

      <p className="font-label-sm text-text-soft">
        共 {displayVariants.length} 条细类型
        {pending ? " · 保存中…" : ""}
      </p>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant/50 bg-surface-container-low">
              <th className="font-label-md px-3 py-3">类型名称</th>
              <th className="font-label-md px-3 py-3">类型英文名称</th>
              <th className="font-label-md px-3 py-3">材料</th>
              <th className="font-label-md px-3 py-3">版型</th>
              {axisColumns.map((field) => (
                <th key={field.key} className="font-label-md px-3 py-3">
                  {field.label}
                </th>
              ))}
              <th className="font-label-md px-3 py-3">优点</th>
              <th className="font-label-md px-3 py-3">适用场景</th>
              <th className="font-label-md px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {displayVariants.map((v) => {
              const rowSpec = getCategoryAxisOptions(v.category_code);
              const rowMaterials = rowSpec?.materials ?? [];
              const rowFits = rowSpec?.fitTypes ?? [];
              const rowAxisByKey = rowAxisFieldMap(v.category_code);
              const expanded = expandedIds.has(v.id);

              return (
                <Fragment key={v.id}>
                  <tr
                    className={`border-b border-outline-variant/30 align-top ${
                      v.is_active ? "" : "bg-surface-container/60 opacity-60"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        className="w-full min-w-[5rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md text-sm"
                        defaultValue={v.consumer_label}
                        key={`${v.id}-label-${v.consumer_label}`}
                        onBlur={(e) => {
                          const consumer_label = e.target.value.trim();
                          if (consumer_label && consumer_label !== v.consumer_label) {
                            patchLocal(v.id, { consumer_label });
                            saveField(v.id, { consumer_label });
                          }
                        }}
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        className="w-full min-w-[6rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md text-sm"
                        defaultValue={v.consumer_label_en}
                        key={`${v.id}-en-${v.consumer_label_en}`}
                        onBlur={(e) => {
                          const consumer_label_en = e.target.value.trim();
                          if (consumer_label_en && consumer_label_en !== v.consumer_label_en) {
                            patchLocal(v.id, { consumer_label_en });
                            saveField(v.id, { consumer_label_en });
                          }
                        }}
                      />
                    </td>

                    <td className="px-3 py-2">
                      {rowMaterials.length === 0 ? (
                        <span className="text-text-soft">—</span>
                      ) : (
                        <AxisSelect
                          value={v.material}
                          options={rowMaterials}
                          labelFn={(m) => materialOptionLabelZh(m as Parameters<typeof materialOptionLabelZh>[0])}
                          disabled={pending}
                          onChange={(material) => {
                            patchLocal(v.id, { material });
                            saveField(v.id, { material });
                          }}
                        />
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {rowFits.length === 0 ? (
                        <span className="text-text-soft">—</span>
                      ) : (
                        <AxisSelect
                          value={v.fit_type ?? "regular"}
                          options={rowFits}
                          labelFn={(f) => fitOptionLabelZh(f as Parameters<typeof fitOptionLabelZh>[0])}
                          disabled={pending}
                          onChange={(fit_type) => {
                            patchLocal(v.id, { fit_type });
                            saveField(v.id, { fit_type });
                          }}
                        />
                      )}
                    </td>

                    {axisColumns.map((col) => {
                      const field = rowAxisByKey.get(col.key);
                      if (!field) {
                        return (
                          <td key={col.key} className="px-3 py-2 text-text-soft">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={field.key} className="px-3 py-2">
                          {field.key === "hat_kind" ? (
                            <span className="font-body-md text-sm">
                              {hatKindLabelZh(axisValue(v, field.key)) ?? "—"}
                            </span>
                          ) : (
                            <AxisSelect
                              value={axisValue(v, field.key)}
                              options={field.options}
                              labelFn={field.labelFn}
                              disabled={pending}
                              onChange={(next) => {
                                const patch = { [field.key]: next } as Omit<
                                  UpdateVariantInput,
                                  "id"
                                >;
                                patchLocal(v.id, patch as Partial<AdminVariant>);
                                saveField(v.id, patch);
                              }}
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2">
                      <textarea
                        className="min-h-[3.5rem] w-full min-w-[7rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-sm"
                        defaultValue={v.pros}
                        key={`${v.id}-pros-${v.pros}`}
                        onBlur={(e) => {
                          const pros = e.target.value.trim();
                          if (pros !== v.pros) {
                            patchLocal(v.id, { pros });
                            saveField(v.id, { pros });
                          }
                        }}
                      />
                    </td>

                    <td className="px-3 py-2">
                      <textarea
                        className="min-h-[3.5rem] w-full min-w-[7rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-sm"
                        defaultValue={v.usage_tips}
                        key={`${v.id}-usage-${v.usage_tips}`}
                        onBlur={(e) => {
                          const usage_tips = e.target.value.trim();
                          if (usage_tips !== v.usage_tips) {
                            patchLocal(v.id, { usage_tips });
                            saveField(v.id, { usage_tips });
                          }
                        }}
                      />
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          className={`font-label-md rounded-lg px-3 py-1.5 text-sm ${
                            v.is_active
                              ? "border border-outline-variant text-on-surface"
                              : "bg-secondary text-on-secondary"
                          }`}
                          onClick={() => {
                            patchLocal(v.id, { is_active: !v.is_active });
                            saveField(v.id, { is_active: !v.is_active });
                          }}
                        >
                          {v.is_active ? "下架" : "上架"}
                        </button>
                        <button
                          type="button"
                          className="font-label-sm text-primary underline-offset-2 hover:underline"
                          onClick={() => toggleExpanded(v.id)}
                        >
                          {expanded ? "收起" : "保暖值"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expanded ? (
                    <tr
                      className={`border-b border-outline-variant/30 ${
                        v.is_active ? "bg-surface-container-low/50" : "bg-surface-container/60 opacity-60"
                      }`}
                    >
                      <td colSpan={colCount} className="px-3 py-3">
                        <label className="flex min-w-[5rem] flex-col gap-1">
                          <span className="font-label-sm text-text-soft">保暖值</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 rounded border border-outline-variant bg-surface px-2 py-1.5 text-sm"
                            defaultValue={v.warmth_value}
                            key={`${v.id}-wv-${v.warmth_value}`}
                            onBlur={(e) => {
                              const warmth_value = Number(e.target.value);
                              if (warmth_value !== v.warmth_value) {
                                patchLocal(v.id, { warmth_value });
                                saveField(v.id, { warmth_value });
                              }
                            }}
                          />
                        </label>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {categoryCode && axisSpec && materialOptions.length + fitOptions.length > 0 ? (
        <p className="font-label-sm text-text-soft">
          本品类枚举：材料{" "}
          {materialOptions.length > 0
            ? materialOptions.map(materialOptionLabelZh).join("、")
            : "无"}{" "}
          · 版型{" "}
          {fitOptions.length > 0 ? fitOptions.map(fitOptionLabelZh).join("、") : "无"}
        </p>
      ) : null}
    </div>
  );
}
