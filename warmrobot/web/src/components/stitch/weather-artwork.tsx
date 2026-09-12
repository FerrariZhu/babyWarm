import { pencilWeatherIcon } from "@/lib/pencil-icons";

/** Condition remains visible as text; the artwork is decorative. */
export function WeatherArtwork({ condition }: { condition: string }) {
  const artwork = pencilWeatherIcon(condition);
  return (
    <span className="weather-artwork" data-condition={condition.includes("晴") ? "sun" : "cloud"} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artwork} width="280" height="280" className="weather-artwork-image" alt="" />
    </span>
  );
}
