"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceSearchHit } from "@warmrobot/core/client";
import { BottomSheet } from "./bottom-sheet";
import { MaterialIcon } from "./material-icon";

export function LocationPickerSheet({
  currentLabel,
  onSelect,
  onUseCurrentLocation,
  onClose,
  locating = false,
}: {
  currentLabel?: string | null;
  onSelect: (place: PlaceSearchHit) => void;
  onUseCurrentLocation: () => void;
  onClose: () => void;
  locating?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceSearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setHits([]);
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { results?: PlaceSearchHit[]; error?: string };
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          throw new Error(data.error ?? "搜索失败");
        }
        const results = data.results ?? [];
        setHits(results);
        setStatus(results.length === 0 ? "empty" : "idle");
        setErrorMessage(null);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setHits([]);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "搜索失败");
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <BottomSheet
      title="选择地点"
      subtitle="搜索城市、区或镇"
      onClose={onClose}
      toolbar={
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="sr-only">搜索地点</span>
            <span className="input-sunken flex min-h-12 items-center gap-2 rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3">
              <MaterialIcon name="search" className="text-[22px] text-primary" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如 南翔、杭州、朝阳区"
                autoComplete="off"
                enterKeyHint="search"
                className="font-body-md min-w-0 flex-1 bg-transparent py-3 text-on-surface outline-none placeholder:text-on-surface-variant/70"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                  aria-label="清除搜索"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                </button>
              ) : null}
            </span>
          </label>

          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={locating}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-primary/15 bg-primary-fixed/60 px-3 text-left transition-colors hover:bg-primary-fixed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary">
              <MaterialIcon name="my_location" className="text-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-label-md block text-on-primary-container">
                {locating ? "正在定位…" : "使用当前位置"}
              </span>
              <span className="font-label-sm block truncate text-on-primary-container/80">
                {currentLabel?.trim() || "需要定位权限"}
              </span>
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {status === "idle" && !query.trim() ? (
          <p className="font-body-md px-1 py-6 text-center text-on-surface-variant">
            输入地名即可切换城市，穿搭会按当地天气重算。
          </p>
        ) : null}
        {status === "loading" ? (
          <p className="font-label-sm px-1 py-2 text-on-surface-variant">正在搜索…</p>
        ) : null}
        {status === "empty" ? (
          <p className="font-body-md px-1 py-6 text-center text-on-surface-variant">
            没有找到「{query.trim()}」，试试更完整的地名。
          </p>
        ) : null}
        {status === "error" ? (
          <p className="font-body-md px-1 py-4 text-center text-error">{errorMessage}</p>
        ) : null}

        {hits.length > 0 ? (
          <ul className="flex flex-col gap-1.5" aria-label="搜索结果">
            {hits.map((hit) => (
              <li key={`${hit.latitude},${hit.longitude},${hit.name}`}>
                <button
                  type="button"
                  onClick={() => onSelect(hit)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary">
                    <MaterialIcon name="location_on" filled className="text-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-label-md block truncate text-on-surface">{hit.name}</span>
                    {hit.subtitle ? (
                      <span className="font-label-sm block truncate text-on-surface-variant">
                        {hit.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </BottomSheet>
  );
}
