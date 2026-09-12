const PENCIL_ICON_ROOT = "/illustrations/pencil-system";

const WEATHER_ICON_PATHS = {
  "weather-clear-day": `${PENCIL_ICON_ROOT}/weather/weather-clear-day.png`,
  "weather-clear-night": `${PENCIL_ICON_ROOT}/weather/weather-clear-night.png`,
  "weather-partly-day": `${PENCIL_ICON_ROOT}/weather/weather-partly-day.png`,
  "weather-partly-night": `${PENCIL_ICON_ROOT}/weather/weather-partly-night.png`,
  "weather-cloudy": `${PENCIL_ICON_ROOT}/weather/weather-cloudy.png`,
  "weather-fog": `${PENCIL_ICON_ROOT}/weather/weather-fog.png`,
  "weather-drizzle": `${PENCIL_ICON_ROOT}/weather/weather-drizzle.png`,
  "weather-rain": `${PENCIL_ICON_ROOT}/weather/weather-rain.png`,
  "weather-heavy-rain": `${PENCIL_ICON_ROOT}/weather/weather-heavy-rain.png`,
  "weather-sleet": `${PENCIL_ICON_ROOT}/weather/weather-sleet.png`,
  "weather-light-snow": `${PENCIL_ICON_ROOT}/weather/weather-light-snow.png`,
  "weather-heavy-snow": `${PENCIL_ICON_ROOT}/weather/weather-heavy-snow.png`,
  "weather-shower": `${PENCIL_ICON_ROOT}/weather/weather-shower.png`,
  "weather-thunderstorm": `${PENCIL_ICON_ROOT}/weather/weather-thunderstorm.png`,
  "metric-wind": `${PENCIL_ICON_ROOT}/weather/metric-wind.png`,
  "metric-humidity": `${PENCIL_ICON_ROOT}/weather/metric-humidity.png`,
  "metric-uv": `${PENCIL_ICON_ROOT}/weather/metric-uv.png`,
  "metric-temperature": `${PENCIL_ICON_ROOT}/weather/metric-temperature.png`,
  "tip-umbrella": `${PENCIL_ICON_ROOT}/weather/tip-umbrella.png`,
  "metric-pressure": `${PENCIL_ICON_ROOT}/weather/metric-pressure.png`,
} as const;

const GARMENT_ICON_PATHS = {
  "garment_diaper": `${PENCIL_ICON_ROOT}/garments/garment_diaper.png`,
  "garment_bodysuit_short": `${PENCIL_ICON_ROOT}/garments/garment_bodysuit_short.png`,
  "garment_bodysuit_long": `${PENCIL_ICON_ROOT}/garments/garment_bodysuit_long.png`,
  "garment_tshirt_short": `${PENCIL_ICON_ROOT}/garments/garment_tshirt_short.png`,
  "garment_tshirt_long": `${PENCIL_ICON_ROOT}/garments/garment_tshirt_long.png`,
  "garment_thermal_top": `${PENCIL_ICON_ROOT}/garments/garment_thermal_top.png`,
  "garment_sweater": `${PENCIL_ICON_ROOT}/garments/garment_sweater.png`,
  "garment_fleece_top": `${PENCIL_ICON_ROOT}/garments/garment_fleece_top.png`,
  "garment_vest": `${PENCIL_ICON_ROOT}/garments/garment_vest.png`,
  "garment_vest_down": `${PENCIL_ICON_ROOT}/garments/garment_vest_down.png`,
  "garment_outer_uv": `${PENCIL_ICON_ROOT}/garments/garment_outer_uv.png`,
  "garment_outer_shell": `${PENCIL_ICON_ROOT}/garments/garment_outer_shell.png`,
  "garment_outer_cotton": `${PENCIL_ICON_ROOT}/garments/garment_outer_cotton.png`,
  "garment_outer_down": `${PENCIL_ICON_ROOT}/garments/garment_outer_down.png`,
  "garment_long_johns": `${PENCIL_ICON_ROOT}/garments/garment_long_johns.png`,
  "garment_pants_short": `${PENCIL_ICON_ROOT}/garments/garment_pants_short.png`,
  "garment_pants_mid": `${PENCIL_ICON_ROOT}/garments/garment_pants_mid.png`,
  "garment_pants_long": `${PENCIL_ICON_ROOT}/garments/garment_pants_long.png`,
  "garment_shoes_sandal": `${PENCIL_ICON_ROOT}/garments/garment_shoes_sandal.png`,
  "garment_shoes_sneaker": `${PENCIL_ICON_ROOT}/garments/garment_shoes_sneaker.png`,
  "garment_shoes_leather": `${PENCIL_ICON_ROOT}/garments/garment_shoes_leather.png`,
  "garment_shoes_boot": `${PENCIL_ICON_ROOT}/garments/garment_shoes_boot.png`,
  "garment_hat_sun": `${PENCIL_ICON_ROOT}/garments/garment_hat_sun.png`,
  "garment_hat_warm": `${PENCIL_ICON_ROOT}/garments/garment_hat_warm.png`,
  "garment_scarf": `${PENCIL_ICON_ROOT}/garments/garment_scarf.png`,
  "garment_gloves": `${PENCIL_ICON_ROOT}/garments/garment_gloves.png`,
  "garment_socks": `${PENCIL_ICON_ROOT}/garments/garment_socks.png`,
} as const;

type WeatherIconName = keyof typeof WEATHER_ICON_PATHS;

export function pencilWeatherIcon(condition: string): string {
  if (condition.includes("雷")) return WEATHER_ICON_PATHS["weather-thunderstorm"];
  if (condition.includes("冻雨") || condition.includes("冰")) return WEATHER_ICON_PATHS["weather-sleet"];
  if (condition.includes("雪")) {
    return /大雪|暴雪/.test(condition)
      ? WEATHER_ICON_PATHS["weather-heavy-snow"]
      : WEATHER_ICON_PATHS["weather-light-snow"];
  }
  if (condition.includes("雨")) {
    if (/暴雨|大雨/.test(condition)) return WEATHER_ICON_PATHS["weather-heavy-rain"];
    if (/小雨|毛毛雨/.test(condition)) return WEATHER_ICON_PATHS["weather-drizzle"];
    return WEATHER_ICON_PATHS["weather-rain"];
  }
  if (condition.includes("雾")) return WEATHER_ICON_PATHS["weather-fog"];
  if (condition.includes("阴")) return WEATHER_ICON_PATHS["weather-cloudy"];
  if (condition.includes("多云")) return WEATHER_ICON_PATHS["weather-partly-day"];
  if (condition.includes("晴")) return WEATHER_ICON_PATHS["weather-clear-day"];
  return WEATHER_ICON_PATHS["weather-partly-day"];
}

export function pencilMetricIcon(metric: "humidity" | "uv" | "wind" | "temperature" | "umbrella" | "pressure"): string {
  const icons: Record<typeof metric, WeatherIconName> = {
    humidity: "metric-humidity",
    uv: "metric-uv",
    wind: "metric-wind",
    temperature: "metric-temperature",
    umbrella: "tip-umbrella",
    pressure: "metric-pressure",
  };
  return WEATHER_ICON_PATHS[icons[metric]];
}

export function pencilGarmentIcon(iconKey: string): string | undefined {
  return GARMENT_ICON_PATHS[iconKey as keyof typeof GARMENT_ICON_PATHS];
}
