"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaceSearchHit, WeatherResult } from "@warmrobot/core/client";
import { DeviceLocationError, getDeviceLocation } from "@/lib/device-location";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { WeatherWidget, WeatherContextRow } from "@/components/stitch/weather-widget";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { HourPickerSheet } from "@/components/stitch/hour-picker-sheet";
import { LocationPickerSheet } from "@/components/stitch/location-picker-sheet";
import { formatHourChipDisplay, formatObservedAtDisplay } from "@/lib/daily-brief/format";
import { homeHref } from "@/lib/home-href";

type WeatherView = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  text: string;
  precipProbability?: number;
  uvIndex?: number;
  observedAt?: string;
};

type OpenSheet = "time" | "location" | null;

function toWeatherView(result: WeatherResult): WeatherView {
  return {
    temp: result.temp,
    feelsLike: result.feelsLike,
    humidity: result.humidity,
    windSpeed: result.windSpeed,
    text: result.text,
    precipProbability: result.precipProbability,
    uvIndex: result.uvIndex,
    observedAt: result.observedAt ?? result.fetchedAt,
  };
}

function WeatherWidgetSkeleton({
  message,
  timeLabel,
  locationLabel,
  onPickTime,
  onPickLocation,
}: {
  message: string;
  timeLabel: string;
  locationLabel: string;
  onPickTime: () => void;
  onPickLocation: () => void;
}) {
  return (
    <section className="glass-weather relative flex flex-col overflow-hidden rounded-2xl p-card-padding">
      <WeatherContextRow
        timeLabel={timeLabel}
        locationLabel={locationLabel}
        onPickTime={onPickTime}
        onPickLocation={onPickLocation}
      />
      <div className="flex flex-col items-center text-center">
        <MaterialIcon name="my_location" className="mb-2 animate-pulse text-[32px] text-primary" />
        <p className="font-body-md text-on-surface">{message}</p>
        <p className="font-label-sm mt-2 text-text-soft">正在获取当地天气…</p>
      </div>
    </section>
  );
}

export function LiveWeatherSection({
  fallbackWeather,
  fallbackLocationLabel,
  fallbackObservedAtDisplay,
  requiredWarmth,
  selectedHourKey = null,
}: {
  fallbackWeather?: WeatherView | null;
  fallbackLocationLabel?: string | null;
  fallbackObservedAtDisplay?: string | null;
  /** 穿衣指数（0–100，内部 requiredWarmth），展示在天气模块气象指标下方 */
  requiredWarmth?: number | null;
  selectedHourKey?: string | null;
}) {
  const router = useRouter();
  const hasFallback = Boolean(fallbackWeather);
  const [weather, setWeather] = useState<WeatherView | null>(fallbackWeather ?? null);
  const [locationLabel, setLocationLabel] = useState<string | null>(
    fallbackLocationLabel ?? null
  );
  const [observedAtDisplay, setObservedAtDisplay] = useState<string | null>(
    fallbackObservedAtDisplay ?? null
  );
  const [status, setStatus] = useState<"locating" | "ready" | "error">(
    hasFallback ? "ready" : "locating"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const fallbackWeatherRef = useRef(fallbackWeather);
  const fallbackLocationRef = useRef(fallbackLocationLabel);
  const fallbackObservedRef = useRef(fallbackObservedAtDisplay);
  const selectedHourRef = useRef(selectedHourKey);
  const syncingRef = useRef(false);
  const autoSyncedRef = useRef(false);

  useEffect(() => {
    fallbackWeatherRef.current = fallbackWeather;
    fallbackLocationRef.current = fallbackLocationLabel;
    fallbackObservedRef.current = fallbackObservedAtDisplay;
    selectedHourRef.current = selectedHourKey;
    if (fallbackWeather) {
      setWeather(fallbackWeather);
      setLocationLabel(fallbackLocationLabel ?? null);
      setObservedAtDisplay(fallbackObservedAtDisplay ?? null);
      setStatus("ready");
    }
  }, [fallbackLocationLabel, fallbackObservedAtDisplay, fallbackWeather, selectedHourKey]);

  const navigateHome = useCallback(
    (options?: { refresh?: boolean; at?: string | null }) => {
      router.replace(homeHref(options));
      router.refresh();
    },
    [router]
  );

  const syncFromDevice = useCallback(
    async (options?: { background?: boolean; refreshPage?: boolean }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      const background = options?.background ?? false;
      const refreshPage = options?.refreshPage ?? !background;
      setErrorMessage(null);

      if (background) {
        setIsSyncing(true);
      } else {
        setStatus("locating");
      }

      try {
        const coords = await Promise.race([
          getDeviceLocation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new DeviceLocationError("timeout", "定位超时，将使用已保存的城市天气")
                ),
              15_000
            )
          ),
        ]);
        const res = await fetch("/api/profile/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        });

        const data = (await res.json()) as WeatherResult & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "天气同步失败");
        }

        const view = toWeatherView(data);
        setWeather(view);
        setLocationLabel(data.location.name);
        setObservedAtDisplay(
          view.observedAt ? formatObservedAtDisplay(view.observedAt) : null
        );
        setStatus("ready");
        setOpenSheet(null);

        if (refreshPage) {
          navigateHome({ refresh: true, at: selectedHourRef.current });
        }
      } catch (error) {
        if (error instanceof DeviceLocationError && error.code === "denied") {
          setErrorMessage(error.message);
        } else {
          const message = error instanceof Error ? error.message : "定位或天气获取失败";
          setErrorMessage(message);
        }

        const fbWeather = fallbackWeatherRef.current;
        const fbLoc = fallbackLocationRef.current;
        const fbObs = fallbackObservedRef.current;
        if (fbWeather) {
          setWeather(fbWeather);
          setLocationLabel(fbLoc ?? null);
          setObservedAtDisplay(fbObs ?? null);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [navigateHome]
  );

  useEffect(() => {
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    if (fallbackWeatherRef.current) return;
    void syncFromDevice({
      background: false,
      refreshPage: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePullRefresh = useCallback(
    () =>
      syncFromDevice({
        background: true,
        refreshPage: true,
      }),
    [syncFromDevice]
  );

  const { pullDistance, state: pullState, hint, isActive } = usePullToRefresh(
    handlePullRefresh,
    status === "ready" && openSheet == null
  );

  const savePlace = useCallback(
    async (body: { latitude: number; longitude: number } | { city: string }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setIsSyncing(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/profile/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as WeatherResult & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "地点更新失败");
        }
        const view = toWeatherView(data);
        setWeather(view);
        setLocationLabel(data.location.name);
        setObservedAtDisplay(
          view.observedAt ? formatObservedAtDisplay(view.observedAt) : null
        );
        setStatus("ready");
        setOpenSheet(null);
        navigateHome({ refresh: true, at: selectedHourRef.current });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "地点更新失败");
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [navigateHome]
  );

  const handleSelectPlace = useCallback(
    (place: PlaceSearchHit) => {
      void savePlace({
        latitude: place.latitude,
        longitude: place.longitude,
      });
    },
    [savePlace]
  );

  const handleConfirmHour = useCallback(
    (hourKey: string | null) => {
      setOpenSheet(null);
      navigateHome(hourKey ? { at: hourKey } : { refresh: true });
    },
    [navigateHome]
  );

  const timeSource = selectedHourKey ?? weather?.observedAt ?? observedAtDisplay;
  const timeLabel = timeSource ? formatHourChipDisplay(timeSource) : "选择时间";
  const placeLabel = locationLabel?.trim() || (status === "locating" ? "定位中…" : "选择地点");

  const context = {
    timeLabel,
    locationLabel: placeLabel,
    onPickTime: () => setOpenSheet("time"),
    onPickLocation: () => setOpenSheet("location"),
  };

  const sheets = (
    <>
      {openSheet === "time" ? (
        <HourPickerSheet
          value={selectedHourKey}
          onConfirm={handleConfirmHour}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}
      {openSheet === "location" ? (
        <LocationPickerSheet
          currentLabel={locationLabel}
          locating={isSyncing}
          onSelect={handleSelectPlace}
          onUseCurrentLocation={() =>
            void syncFromDevice({ background: true, refreshPage: true })
          }
          onClose={() => setOpenSheet(null)}
        />
      ) : null}
    </>
  );

  if (status === "locating") {
    return (
      <div className="flex flex-col pt-2">
        <WeatherWidgetSkeleton message="正在获取你的位置" {...context} />
        {sheets}
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <section className="rounded-2xl bg-error-container p-4">
          <WeatherContextRow {...context} />
          <div className="text-center">
            <MaterialIcon name="cloud_off" className="mb-3 text-[40px] text-on-error-container" />
            <p className="font-body-md text-on-error-container">
              {errorMessage ?? "无法获取天气，请检查定位权限与网络。"}
            </p>
            <button
              type="button"
              onClick={() => void syncFromDevice({ refreshPage: true })}
              className="font-label-md mt-4 inline-flex min-h-touch-target-min items-center gap-2 rounded-full bg-primary px-6 py-3 text-on-primary shadow-sm"
            >
              <MaterialIcon name="my_location" />
              允许定位并重试
            </button>
          </div>
        </section>
        {sheets}
      </div>
    );
  }

  return (
    <>
      {isActive && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-safe"
          style={{ transform: `translateY(${Math.max(pullDistance, 0)}px)` }}
          aria-live="polite"
        >
          <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 cloud-shadow">
            <span
              className={pullState === "refreshing" ? "inline-flex animate-spin" : "inline-flex"}
              style={
                pullState === "pulling"
                  ? { transform: `rotate(${Math.min(pullDistance * 2.5, 180)}deg)` }
                  : undefined
              }
            >
              <MaterialIcon name="refresh" className="text-[18px] text-primary" />
            </span>
            <span className="font-label-sm text-on-surface-variant">{hint}</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 pt-2">
        <WeatherWidget
          weather={weather}
          requiredWarmth={requiredWarmth}
          {...context}
        />
        {isSyncing && (
          <p className="font-label-sm text-center text-text-soft">正在更新天气…</p>
        )}
        {errorMessage && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-center">
            <p className="font-body-md text-on-error-container">{errorMessage}</p>
            <p className="font-label-sm text-on-error-container/80">
              上方显示的是已保存或默认城市天气
            </p>
            <button
              type="button"
              onClick={() => void syncFromDevice({ refreshPage: true })}
              className="font-label-md inline-flex min-h-touch-target-min items-center gap-1 text-on-error-container underline-offset-2 hover:underline"
            >
              <MaterialIcon name="my_location" className="text-[16px]" />
              使用当前位置
            </button>
          </div>
        )}
      </div>
      {sheets}
    </>
  );
}
