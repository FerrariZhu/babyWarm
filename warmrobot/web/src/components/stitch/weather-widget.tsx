"use client";

import { pencilMetricIcon } from "@/lib/pencil-icons";
import { WeatherArtwork } from "./weather-artwork";

function WeatherControlIcon({ name, className = "" }: { name: "clock" | "location" | "chevron-down"; className?: string }) {
  const paths = {
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5v5l3.25 2" /></>,
    location: <><path d="M12 21s6-5.03 6-10a6 6 0 1 0-12 0c0 4.97 6 10 6 10Z" /><circle cx="12" cy="11" r="2" /></>,
    "chevron-down": <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />,
  } as const;

  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`weather-control-icon ${className}`}>{paths[name]}</svg>;
}

function windLabel(windSpeedMs: number): string {
  const kmh = windSpeedMs * 3.6;
  if (kmh < 12) return "微风";
  if (kmh < 20) return `${Math.round(kmh)} km/h`;
  return `${Math.round(kmh)} km/h`;
}

function MetricCell({
  metric,
  label,
  value,
}: {
  metric: "humidity" | "uv" | "wind" | "temperature";
  label: string;
  value: string;
}) {
  return (
    <div className="weather-metric-cell flex flex-col items-center justify-center px-1.5 py-1">
      <span className="weather-metric-icon" data-motion={metric} key={`${metric}-${value}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pencilMetricIcon(metric)} alt="" />
      </span>
      <span className="font-label-sm text-text-soft">{label}</span>
      <span className="font-label-md text-on-surface">{value}</span>
    </div>
  );
}

function ContextPickButton({
  icon,
  label,
  ariaLabel,
  onClick,
}: {
  icon: "clock" | "location";
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${ariaLabel}：${label}`}
      onClick={onClick}
      className="flex min-h-11 min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-on-surface transition-colors hover:bg-surface-container-lowest/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <WeatherControlIcon name={icon} className="shrink-0 text-primary" />
      <span className="font-label-sm min-w-0 truncate">{label}</span>
      <WeatherControlIcon name="chevron-down" className="shrink-0 text-outline" />
    </button>
  );
}

export function WeatherContextRow({
  timeLabel,
  locationLabel,
  onPickTime,
  onPickLocation,
}: {
  timeLabel: string;
  locationLabel: string;
  onPickTime: () => void;
  onPickLocation: () => void;
}) {
  return (
    <div className="weather-context-row relative z-10 flex min-w-0 items-center">
      <ContextPickButton
        icon="clock"
        label={timeLabel}
        ariaLabel="选择时间"
        onClick={onPickTime}
      />
      <span className="font-label-sm shrink-0 text-outline-variant" aria-hidden>
        ·
      </span>
      <div className="min-w-0 flex-1">
        <ContextPickButton
          icon="location"
          label={locationLabel}
          ariaLabel="选择地点"
          onClick={onPickLocation}
        />
      </div>
    </div>
  );
}

export function WeatherWidget({
  timeLabel,
  locationLabel,
  onPickTime,
  onPickLocation,
  weather,
}: {
  timeLabel: string;
  locationLabel: string;
  onPickTime: () => void;
  onPickLocation: () => void;
  weather: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    text: string;
    precipProbability?: number;
    uvIndex?: number;
  };
}) {
  const uv = weather.uvIndex ?? 0;
  // 仅在极端条件下展示摘要；常规提醒由下方气象指标和标签承载。
  const summaryParts = [
    Math.max(weather.temp, weather.feelsLike) >= 35 ? "高温天气" : null,
    Math.min(weather.temp, weather.feelsLike) <= -10 ? "严寒天气" : null,
    weather.windSpeed >= 20 ? "强风天气" : null,
    uv >= 11 ? "紫外线极强" : null,
    /暴雨|暴雪|雷雨|雷暴|冰雹|冻雨|台风/.test(weather.text) ? weather.text : null,
  ].filter(Boolean);
  const summary = summaryParts.length > 0 ? summaryParts.join("，") + "。" : null;
  return (
    <section
      className="weather-hero glass-weather relative overflow-hidden rounded-2xl p-card-padding"
      aria-label="天气模块"
    >
      <WeatherContextRow
        timeLabel={timeLabel}
        locationLabel={locationLabel}
        onPickTime={onPickTime}
        onPickLocation={onPickLocation}
      />

      <div className="weather-overview relative z-10 mb-2.5 flex items-center justify-between gap-2">
        <div className="weather-reading min-w-0">
          <span className="weather-temperature text-primary">
            {Math.round(weather.temp)}<span className="weather-temperature-unit">°C</span>
          </span>
          <span className="weather-reading-divider" aria-hidden="true" />
          <div className="weather-condition min-w-0">
            <p className="weather-condition-title">{weather.text}</p>
            {summary && (
              <p className="weather-condition-summary text-on-surface-variant">{summary}</p>
            )}
          </div>
        </div>
        <WeatherArtwork condition={weather.text} />
      </div>

      <div className="weather-metrics relative z-10 grid grid-cols-4">
        <MetricCell metric="humidity" label="湿度" value={`${weather.humidity}%`} />
        <MetricCell
          metric="uv"
          label="紫外线"
          value={`${uv % 1 === 0 ? uv : uv.toFixed(1)}`}
        />
        <MetricCell
          metric="wind"
          label="风速"
          value={windLabel(weather.windSpeed)}
        />
        <MetricCell
          metric="temperature"
          label="体感温度"
          value={`${Math.round(weather.feelsLike)}°C`}
        />
      </div>

    </section>
  );
}
