import { weatherIcon } from "@/lib/stitch-utils";

const WEATHER_ARTWORK: Record<string, string> = {
  partly_cloudy_day: "sun_behind_cloud_flat.svg",
  cloud: "cloud_flat.svg",
  rainy: "cloud_with_rain_flat.svg",
  snowing: "cloud_with_snow_flat.svg",
  foggy: "fog_flat.svg",
};

/** Locally bundled Microsoft Fluent artwork; condition remains visible as text. */
export function WeatherArtwork({ condition }: { condition: string }) {
  const artwork = /雷/.test(condition)
    ? "cloud_with_lightning_and_rain_flat.svg"
    : condition === "晴"
      ? "sun_flat.svg"
      : WEATHER_ARTWORK[weatherIcon(condition)];
  return (
    <span className="weather-artwork" data-condition={condition === "晴" ? "sun" : "cloud"} aria-hidden="true">
    {condition === "晴" ? (
      <svg viewBox="0 0 64 64" width="60" height="60" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="13" fill="#ffdc65" stroke="#f3ad08" strokeWidth="3" />
        {[[32, 7], [50, 14], [57, 32], [50, 50], [32, 57], [14, 50], [7, 32], [14, 14]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#f5b50b" />
        ))}
      </svg>
    ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={artwork}
      src={`/illustrations/fluent/${artwork}`}
      width="72"
      height="72"
      className="h-[72px] w-[72px] shrink-0 object-contain p-1"
      alt=""
    />
    )}
    </span>
  );
}
