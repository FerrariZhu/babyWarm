"use client";

import type { AdviceTipTag, AdviceTipTagTone } from "@warmrobot/core/client";
import { resolveAdviceTipTags } from "@warmrobot/core/client";
import { MaterialIcon } from "./material-icon";
import { weatherIcon } from "@/lib/stitch-utils";

function uvLabel(uv: number): string {
  if (uv < 3) return "低";
  if (uv < 6) return "中等";
  if (uv < 8) return "高";
  if (uv < 11) return "很高";
  return "极高";
}

function windLabel(windSpeedMs: number): string {
  const kmh = windSpeedMs * 3.6;
  if (kmh < 12) return "微风";
  if (kmh < 20) return `${Math.round(kmh)} km/h`;
  return `${Math.round(kmh)} km/h`;
}

function MetricCell({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: string;
  label: string;
  value: string;
  iconClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-surface-variant/30 bg-surface-container-lowest/80 px-1.5 py-2">
      <MaterialIcon name={icon} className={`mb-0.5 text-[18px] ${iconClass ?? "text-primary"}`} />
      <span className="font-label-sm text-text-soft">{label}</span>
      <span className="font-label-md text-on-surface">{value}</span>
    </div>
  );
}

function tipToneClass(tone: AdviceTipTagTone): string {
  switch (tone) {
    case "uv":
      return "bg-weather-uv-alert/10 text-weather-uv-alert";
    case "rain":
      return "bg-weather-rainy/15 text-weather-rainy";
    case "wind":
      return "bg-weather-windy/15 text-weather-windy";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function ContextPickButton({
  icon,
  filled,
  label,
  ariaLabel,
  onClick,
}: {
  icon: string;
  filled?: boolean;
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
      <MaterialIcon name={icon} filled={filled} className="shrink-0 text-[18px] text-primary" />
      <span className="font-label-sm min-w-0 truncate">{label}</span>
      <MaterialIcon name="expand_more" className="shrink-0 text-[18px] text-outline" />
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
    <div className="relative z-10 -mx-1.5 mb-1.5 flex min-w-0 items-center">
      <ContextPickButton
        icon="schedule"
        label={timeLabel}
        ariaLabel="选择时间"
        onClick={onPickTime}
      />
      <span className="font-label-sm shrink-0 text-outline-variant" aria-hidden>
        ·
      </span>
      <div className="min-w-0 flex-1">
        <ContextPickButton
          icon="location_on"
          filled
          label={locationLabel}
          ariaLabel="选择地点"
          onClick={onPickLocation}
        />
      </div>
    </div>
  );
}

function WeatherTipChips({ tags }: { tags: AdviceTipTag[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="relative z-10 mt-2 flex flex-wrap gap-1.5" aria-label="天气提醒">
      {tags.map((tag) => (
        <span
          key={tag.code}
          className={`font-label-sm rounded-sm px-2.5 py-0.5 ${tipToneClass(tag.tone)}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export function WeatherWidget({
  timeLabel,
  locationLabel,
  onPickTime,
  onPickLocation,
  weather,
  requiredWarmth,
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
  /** 穿衣指数（0–100，内部 requiredWarmth），展示在气象指标下方 */
  requiredWarmth?: number | null;
}) {
  const uv = weather.uvIndex ?? 0;
  const uvHigh = uv >= 6;
  const precip = weather.precipProbability;
  const precipAlert = precip != null && precip >= 50;
  const summaryParts = [
    Math.abs(weather.feelsLike - weather.temp) >= 3
      ? `体感 ${Math.round(weather.feelsLike)}°C`
      : null,
    uvHigh ? "紫外线偏高" : null,
    precipAlert ? `降水 ${Math.round(precip)}%` : null,
  ].filter(Boolean);
  const summary =
    summaryParts.length > 0
      ? summaryParts.join("，") + "。"
      : "适宜根据下方清单增减衣物。";
  const adviceValue =
    requiredWarmth != null && Number.isFinite(requiredWarmth)
      ? Math.round(requiredWarmth)
      : null;

  const tipTags = resolveAdviceTipTags({
    temp: weather.temp,
    feelsLike: weather.feelsLike,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    pressure: 1013,
    text: weather.text,
    precipProbability: weather.precipProbability,
    uvIndex: weather.uvIndex,
  });

  return (
    <section
      className="glass-weather relative overflow-hidden rounded-2xl p-card-padding"
      aria-label="天气模块"
    >
      <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed opacity-50 mix-blend-multiply blur-2xl" />

      <WeatherContextRow
        timeLabel={timeLabel}
        locationLabel={locationLabel}
        onPickTime={onPickTime}
        onPickLocation={onPickLocation}
      />

      <div className="relative z-10 mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-end gap-1.5">
            <span className="font-headline-lg-mobile text-primary md:font-headline-lg">
              {Math.round(weather.temp)}°C
            </span>
            <span className="font-label-md mb-1 text-text-soft">{weather.text}</span>
          </div>
          <p className="font-body-md leading-snug text-on-surface-variant">{summary}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-surface-variant/50 bg-surface-container-lowest shadow-sm">
          <MaterialIcon
            name={weatherIcon(weather.text)}
            filled
            className="text-[28px] text-weather-sunny"
          />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-widget-gap">
        <MetricCell icon="humidity_percentage" label="湿度" value={`${weather.humidity}%`} />
        <MetricCell
          icon="wb_sunny"
          label="紫外线"
          value={`${uv % 1 === 0 ? uv : uv.toFixed(1)}（${uvLabel(uv)}）`}
          iconClass={uvHigh ? "text-weather-uv-alert" : "text-weather-sunny"}
        />
        <MetricCell
          icon="air"
          label="风速"
          value={windLabel(weather.windSpeed)}
          iconClass="text-text-soft"
        />
      </div>

      {adviceValue != null && (
        <div
          className="relative z-10 mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-primary-fixed/40 px-3 py-2"
          aria-label={`穿衣指数 ${adviceValue}`}
        >
          <div className="min-w-0">
            <p className="font-label-md text-on-primary-container">穿衣指数</p>
            <p className="font-label-sm mt-0.5 leading-snug text-text-soft">
              综合气温、体感、湿度与风速得出，分数越高越需要保暖
            </p>
          </div>
          <span className="font-headline-md shrink-0 tabular-nums text-primary">
            {adviceValue}
          </span>
        </div>
      )}

      <WeatherTipChips tags={tipTags} />
    </section>
  );
}
