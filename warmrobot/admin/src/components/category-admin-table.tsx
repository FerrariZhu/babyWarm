"use client";

import { useRef, useState, useTransition } from "react";
import {
  addProductLink,
  createCategory,
  removeProductLink,
  setCategoryActive,
  updateCategory,
  uploadCategoryIcon,
} from "@/app/admin/categories/actions";
import {
  OUTFIT_SLOTS,
  PRESET_ICONS,
  type AdminCategory,
  type OutfitSlot,
} from "@/lib/admin/category-types";
import { MaterialIcon } from "@/components/material-icon";

type Props = {
  initialCategories: AdminCategory[];
};

const emptyCreate = {
  code: "",
  name_zh: "",
  name_en: "",
  outfit_slot: "base_top" as OutfitSlot,
  warmth_min: 0,
  warmth_max: 100,
  icon_key: "checkroom",
};

export function CategoryAdminTable({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "操作失败");
        return;
      }
      onOk?.();
    });
  }

  function patchLocal(id: string, patch: Partial<AdminCategory>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function saveField(
    id: string,
    patch: Omit<Parameters<typeof updateCategory>[0], "id">
  ) {
    run(async () => {
      const result = await updateCategory({ ...patch, id });
      if (result.ok) {
        setCategories((prev) => prev.map((c) => (c.id === id ? result.data : c)));
      }
      return result;
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label-sm text-text-soft">
          共 {categories.length} 个品类
          {pending ? " · 保存中…" : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="font-label-md inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-on-primary"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          新建品类
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-sm">
          <h2 className="font-headline-md mb-3">新建品类</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <span className="font-label-sm text-text-soft">英文名称（C 端展示）</span>
              <input
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.name_en}
                placeholder="Short-Sleeve T-Shirt"
                onChange={(e) => setCreateForm((f) => ({ ...f, name_en: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">穿搭槽位</span>
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
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">穿衣指数下限</span>
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
              <span className="font-label-sm text-text-soft">穿衣指数上限</span>
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
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-text-soft">图标</span>
              <select
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md"
                value={createForm.icon_key}
                onChange={(e) => setCreateForm((f) => ({ ...f, icon_key: e.target.value }))}
              >
                {PRESET_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending}
              className="font-label-md rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
              onClick={() =>
                run(
                  async () => {
                    const result = await createCategory(createForm);
                    if (result.ok) {
                      setCategories((prev) => [...prev, result.data]);
                      setCreateForm(emptyCreate);
                      setShowCreate(false);
                    }
                    return result;
                  }
                )
              }
            >
              保存
            </button>
            <button
              type="button"
              className="font-label-md rounded-lg border border-outline-variant px-4 py-2"
              onClick={() => setShowCreate(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant/50 bg-surface-container-low">
              <th className="font-label-md px-3 py-3">图标</th>
              <th className="font-label-md px-3 py-3">名称</th>
              <th className="font-label-md px-3 py-3">槽位</th>
              <th className="font-label-md px-3 py-3">商品链接</th>
              <th className="font-label-md px-3 py-3">穿衣指数区间</th>
              <th className="font-label-md px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className={`border-b border-outline-variant/30 align-top ${
                  cat.is_active ? "" : "bg-surface-container/60 opacity-70"
                }`}
              >
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-surface-container">
                      {cat.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.icon_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MaterialIcon
                          name={cat.icon_key || "category"}
                          className="text-[22px] text-primary"
                        />
                      )}
                    </div>
                    <select
                      className="max-w-[9rem] rounded border border-outline-variant bg-surface px-1 py-1 text-xs"
                      value={cat.icon_key ?? ""}
                      onChange={(e) => {
                        const icon_key = e.target.value || null;
                        patchLocal(cat.id, { icon_key });
                        saveField(cat.id, { icon_key });
                      }}
                    >
                      <option value="">（无）</option>
                      {PRESET_ICONS.map((icon) => (
                        <option key={icon.value} value={icon.value}>
                          {icon.label}
                        </option>
                      ))}
                      {cat.icon_key &&
                        !PRESET_ICONS.some((icon) => icon.value === cat.icon_key) && (
                          <option value={cat.icon_key}>{cat.icon_key}</option>
                        )}
                    </select>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[cat.id] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.set("file", file);
                        run(async () => {
                          const result = await uploadCategoryIcon(cat.id, fd);
                          if (result.ok) {
                            patchLocal(cat.id, { icon_url: result.data.icon_url });
                          }
                          return result;
                        });
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="font-label-sm text-primary"
                      onClick={() => fileInputRefs.current[cat.id]?.click()}
                    >
                      上传
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-0.5">
                      <span className="font-label-sm text-text-soft">中文</span>
                      <input
                        className="w-full min-w-[8rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md"
                        defaultValue={cat.name_zh}
                        key={`${cat.id}-name-zh-${cat.name_zh}`}
                        onBlur={(e) => {
                          const name_zh = e.target.value.trim();
                          if (name_zh && name_zh !== cat.name_zh) {
                            saveField(cat.id, { name_zh });
                          }
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="font-label-sm text-text-soft">英文（C 端）</span>
                      <input
                        className="w-full min-w-[8rem] rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md"
                        defaultValue={cat.name_en ?? ""}
                        key={`${cat.id}-name-en-${cat.name_en ?? ""}`}
                        placeholder="Short-Sleeve T-Shirt"
                        onBlur={(e) => {
                          const name_en = e.target.value.trim() || null;
                          if (name_en !== cat.name_en) {
                            saveField(cat.id, { name_en });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-soft">{cat.code}</p>
                </td>
                <td className="px-3 py-3">
                  <select
                    className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md"
                    value={cat.outfit_slot ?? ""}
                    onChange={(e) => {
                      const outfit_slot = e.target.value as OutfitSlot;
                      patchLocal(cat.id, { outfit_slot });
                      saveField(cat.id, { outfit_slot });
                    }}
                  >
                    {OUTFIT_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <ul className="mb-2 flex max-w-[16rem] flex-col gap-1">
                    {cat.product_links.map((link) => (
                      <li
                        key={link.id}
                        className="flex items-start gap-1 rounded bg-surface-container px-2 py-1 text-xs"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-primary underline"
                          title={link.url}
                        >
                          {link.title || link.url}
                        </a>
                        <button
                          type="button"
                          className="shrink-0 text-error"
                          aria-label="删除链接"
                          onClick={() =>
                            run(async () => {
                              const result = await removeProductLink(link.id);
                              if (result.ok) {
                                patchLocal(cat.id, {
                                  product_links: cat.product_links.filter(
                                    (l) => l.id !== link.id
                                  ),
                                });
                              }
                              return result;
                            })
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-1">
                    <input
                      className="min-w-0 flex-1 rounded border border-outline-variant bg-surface px-2 py-1 text-xs"
                      placeholder="https://…"
                      value={linkDrafts[cat.id] ?? ""}
                      onChange={(e) =>
                        setLinkDrafts((d) => ({ ...d, [cat.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded bg-secondary-container px-2 py-1 text-xs text-on-secondary-container"
                      onClick={() => {
                        const url = linkDrafts[cat.id]?.trim();
                        if (!url) return;
                        run(async () => {
                          const result = await addProductLink(cat.id, url);
                          if (result.ok) {
                            patchLocal(cat.id, {
                              product_links: [...cat.product_links, result.data],
                            });
                            setLinkDrafts((d) => ({ ...d, [cat.id]: "" }));
                          }
                          return result;
                        });
                      }}
                    >
                      添加
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-14 rounded border border-outline-variant bg-surface px-1 py-1 text-sm"
                      defaultValue={cat.warmth_min}
                      key={`${cat.id}-min-${cat.warmth_min}`}
                      onBlur={(e) => {
                        const warmth_min = Number(e.target.value);
                        if (warmth_min !== cat.warmth_min) {
                          saveField(cat.id, { warmth_min });
                        }
                      }}
                    />
                    <span className="text-text-soft">–</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-14 rounded border border-outline-variant bg-surface px-1 py-1 text-sm"
                      defaultValue={cat.warmth_max}
                      key={`${cat.id}-max-${cat.warmth_max}`}
                      onBlur={(e) => {
                        const warmth_max = Number(e.target.value);
                        if (warmth_max !== cat.warmth_max) {
                          saveField(cat.id, { warmth_max });
                        }
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    disabled={pending}
                    className={`font-label-md rounded-lg px-3 py-2 ${
                      cat.is_active
                        ? "border border-outline-variant text-on-surface"
                        : "bg-secondary text-on-secondary"
                    }`}
                    onClick={() =>
                      run(async () => {
                        const result = await setCategoryActive(cat.id, !cat.is_active);
                        if (result.ok) {
                          setCategories((prev) =>
                            prev.map((c) => (c.id === cat.id ? result.data : c))
                          );
                        }
                        return result;
                      })
                    }
                  >
                    {cat.is_active ? "下架" : "上架"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
