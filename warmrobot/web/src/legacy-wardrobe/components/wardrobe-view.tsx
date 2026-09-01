"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DbClothingItem } from "@/lib/db/types";
import {
  WARDROBE_FILTERS,
  matchesWardrobeFilter,
  seasonBadgeClass,
  seasonBadgeLabel,
  warmthIndexLabel,
  type WardrobeFilter,
} from "@/legacy-wardrobe/lib/clothing-display";
import { formatFetchErrorMessage } from "@/lib/fetch-error";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { ClothingDetailSheet } from "@/legacy-wardrobe/components/clothing-detail-sheet";
import type { DbMaterial } from "@/lib/db/types";

export function WardrobeView({
  items: initialItems,
  materials,
}: {
  items: DbClothingItem[];
  materials: DbMaterial[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WardrobeFilter>("all");

  function handleItemDeleted(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedItem((current) => (current?.id === itemId ? null : current));
    router.refresh();
  }

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DbClothingItem | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const itemId = pendingDelete.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      let response: Response;
      try {
        response = await fetch(`/api/clothing/${itemId}`, { method: "DELETE" });
      } catch (networkError) {
        throw new Error(
          formatFetchErrorMessage(networkError, "无法连接服务器，请确认网络后重试")
        );
      }

      let data: { error?: string; ok?: boolean } = {};
      try {
        data = (await response.json()) as { error?: string; ok?: boolean };
      } catch {
        throw new Error(response.ok ? "删除失败" : `删除失败（${response.status}）`);
      }

      if (response.status === 404 || data.ok) {
        handleItemDeleted(itemId);
        setPendingDelete(null);
        setToastMessage("删除成功");
        return;
      }

      if (!response.ok) throw new Error(data.error ?? "删除失败");

      handleItemDeleted(itemId);
      setPendingDelete(null);
      setToastMessage("删除成功");
    } catch (error) {
      setDeleteError(formatFetchErrorMessage(error, "删除失败"));
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesWardrobeFilter(item.category, filter)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.size_label ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="relative w-full">
          <MaterialIcon
            name="search"
            className="absolute top-1/2 left-4 -translate-y-1/2 text-outline"
          />
          <input
            className="font-body-lg h-14 w-full rounded-full border-2 border-surface-container-high bg-surface-container-lowest pr-4 pl-12 text-on-surface input-sunken transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-0 focus:outline-none"
            placeholder="搜索衣柜..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </div>
        <div className="-mx-margin-mobile scrollbar-hide flex snap-x gap-2 overflow-x-auto px-margin-mobile pb-2">
          {WARDROBE_FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={
                filter === chip.id
                  ? "snap-start shrink-0 rounded-full bg-primary px-6 py-2 font-label-caps whitespace-nowrap text-on-primary transition-transform active:scale-95"
                  : "snap-start shrink-0 rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-2 font-label-caps whitespace-nowrap text-on-surface-variant cloud-shadow transition-all hover:bg-surface-container-low active:scale-95"
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="grid grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <WardrobeCard
              key={item.id}
              item={item}
              onSelect={setSelectedItem}
              onRequestDelete={(id, name) => {
                setDeleteError(null);
                setPendingDelete({ id, name });
              }}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-xl bg-surface-container-lowest p-8 text-center cloud-shadow">
          <MaterialIcon name="checkroom" className="mb-3 text-[48px] text-primary/30" />
          <p className="font-body-md text-on-surface-variant">没有匹配的衣物。</p>
        </section>
      )}

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/50 bg-surface-container-low p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <MaterialIcon name="checkroom" className="text-[32px]" />
        </div>
        <h4 className="font-headline-md-mobile mb-2 text-on-surface">建立你的衣柜</h4>
        <p className="font-body-md mb-6 max-w-[250px] text-on-surface-variant">
          添加更多衣物，记录宝宝的舒适度，获取更智能的穿搭建议。
        </p>
        <Link
          href="/add"
          className="font-body-lg flex min-h-touch-target-min items-center gap-2 rounded-full bg-primary px-8 text-on-primary cloud-shadow transition-colors hover:bg-surface-tint"
        >
          <MaterialIcon name="add" />
          添加衣物
        </Link>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 cloud-shadow">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <MaterialIcon name="delete" className="text-[24px]" />
            </div>
            <h3 id="delete-dialog-title" className="font-headline-md-mobile mb-2 text-on-surface">
              确认删除？
            </h3>
            <p className="font-body-md mb-6 text-on-surface-variant">
              确定从衣柜中删除「{pendingDelete.name}」吗？删除后无法恢复。
            </p>
            {deleteError && (
              <p className="font-body-md mb-4 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="font-label-caps flex min-h-touch-target-min flex-1 items-center justify-center rounded-full bg-error-container px-6 text-on-error-container transition-opacity disabled:opacity-60"
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleting) return;
                  setPendingDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="font-label-caps flex min-h-touch-target-min flex-1 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low px-6 text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <ClothingDetailSheet
          item={selectedItem}
          materials={materials}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
        >
          <div className="font-body-md flex items-center gap-2 rounded-full bg-on-background px-5 py-3 text-on-primary shadow-lg">
            <MaterialIcon name="check_circle" className="text-[20px] text-tertiary" filled />
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}

function WardrobeCard({
  item,
  onSelect,
  onRequestDelete,
}: {
  item: DbClothingItem;
  onSelect: (item: DbClothingItem) => void;
  onRequestDelete: (itemId: string, itemName: string) => void;
}) {
  const season = seasonBadgeLabel(item.season_tags);

  return (
    <article
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl bg-surface-container-lowest cloud-shadow transition-all duration-300 hover:-translate-y-1 hover:cloud-shadow-active"
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`查看 ${item.name} 详情`}
    >
      <div className="relative aspect-square w-full bg-[#F4F7F5]">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full rounded-t-xl object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-fixed-dim/20">
            <MaterialIcon name="laundry" className="text-[48px] text-primary/30" />
          </div>
        )}
        <FavoriteButton itemId={item.id} initial={item.is_favorite ?? false} />
        <DeleteButton
          itemName={item.name}
          onRequestDelete={() => onRequestDelete(item.id, item.name)}
        />
      </div>
      <div className="flex flex-grow flex-col gap-2 p-3">
        <div>
          <h3 className="font-body-md leading-tight font-medium text-on-surface">{item.name}</h3>
          <p className="text-sm text-on-surface-variant">{item.size_label ?? "—"}</p>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-surface-variant pt-2">
          <div className="flex items-center gap-1 text-secondary">
            <MaterialIcon name="device_thermostat" className="text-[16px]" />
            <span className="font-data-heavy text-[14px]">
              {warmthIndexLabel(Number(item.warmth_score))}
            </span>
          </div>
          {season && (
            <span
              className={`font-label-caps rounded-full px-2 py-1 text-[10px] ${seasonBadgeClass(season)}`}
            >
              {season}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function FavoriteButton({ itemId, initial }: { itemId: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    const next = !favorite;
    setFavorite(next);
    setLoading(true);
    try {
      await fetch(`/api/clothing/${itemId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: next }),
      });
    } catch {
      setFavorite(!next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90 text-outline backdrop-blur-sm"
      aria-label={favorite ? "Remove favorite" : "Add favorite"}
    >
      <MaterialIcon name={favorite ? "favorite" : "favorite_border"} filled={favorite} className="text-[18px]" />
    </button>
  );
}

function DeleteButton({
  itemName,
  onRequestDelete,
}: {
  itemName: string;
  onRequestDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onRequestDelete();
      }}
      className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90 text-outline backdrop-blur-sm transition-colors hover:bg-error-container hover:text-on-error-container"
      aria-label={`删除 ${itemName}`}
    >
      <MaterialIcon name="delete" className="text-[18px]" />
    </button>
  );
}
