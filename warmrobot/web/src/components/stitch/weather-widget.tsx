"use client";

import type { AdviceTipTag, AdviceTipTagTone } from "@warmrobot/core/client";
import { resolveAdviceTipTags } from "@warmrobot/core/client";
import { MaterialIcon } from "./material-icon";
import { WeatherArtwork } from "./weather-artwork";

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
    <div className="weather-metric-cell flex flex-col items-center justify-center px-1.5 py-1">
      <span className="weather-metric-icon" data-motion={icon} key={`${icon}-${value}`} aria-hidden="true">
        <MaterialIcon name={icon} className={`text-[22px] ${iconClass ?? "text-primary"}`} />
      </span>
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
    <div className="weather-context-row relative z-10 flex min-w-0 items-center">
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
  // 仅在极端条件下展示摘要；常规提醒由下方气象指标和标签承载。
  const summaryParts = [
    Math.max(weather.temp, weather.feelsLike) >= 35 ? "高温天气" : null,
    Math.min(weather.temp, weather.feelsLike) <= -10 ? "严寒天气" : null,
    weather.windSpeed >= 20 ? "强风天气" : null,
    uv >= 11 ? "紫外线极强" : null,
    /暴雨|暴雪|雷雨|雷暴|冰雹|冻雨|台风/.test(weather.text) ? weather.text : null,
  ].filter(Boolean);
  const summary = summaryParts.length > 0 ? summaryParts.join("，") + "。" : null;
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
      className="weather-hero glass-weather relative overflow-hidden rounded-2xl p-card-padding"
      aria-label="天气模块"
    >
      <WeatherContextRow
        timeLabel={timeLabel}
        locationLabel={locationLabel}
        onPickTime={onPickTime}
        onPickLocation={onPickLocation}
      />

      <div className="weather-overview relative z-10 mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-end gap-1.5">
            <span className="weather-temperature text-primary">
              {Math.round(weather.temp)}<span className="weather-temperature-unit">°C</span>
            </span>
          </div>
          <p className="weather-feels-like text-text-soft">
            体感 {Math.round(weather.feelsLike)}°C · {weather.text}
          </p>
          {summary && (
            <p className="font-body-md leading-snug text-on-surface-variant">{summary}</p>
          )}
        </div>
        <WeatherArtwork condition={weather.text} />
      </div>

      <div className="weather-metrics relative z-10 grid grid-cols-3">
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

      {(adviceValue != null || tipTags.length > 0) && (
        <div className="weather-footer">
          {adviceValue != null && (
            <section className="weather-index-panel" aria-label={`穿衣指数 ${adviceValue}`}>
              <div className="weather-index-description">
                <p>结合气温、体感、湿度和风速，数值越高，穿得越暖</p>
                <WeatherTipChips tags={tipTags} />
              </div>
              <div className="weather-index-heading">
                <h3>穿衣指数</h3>
                <span className="weather-index-value">{adviceValue}</span>
              </div>
            </section>
          )}
          {adviceValue == null ? <WeatherTipChips tags={tipTags} /> : null}
        </div>
      )}

    </section>
  );
}
