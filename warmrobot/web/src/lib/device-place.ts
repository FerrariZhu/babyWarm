/** BigDataCloud's free reverse endpoint must be called on the device that obtained the coordinates. */
const REVERSE_URL = "https://api-bdc.net/data/reverse-geocode-client";

type DevicePlaceResponse = {
  countryName?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
  localityInfo?: { administrative?: Array<{ name?: string; order?: number }> };
};

export function formatDevicePlace(data: DevicePlaceResponse): string | null {
  const administrative = (data.localityInfo?.administrative ?? [])
    .filter((part) => part.name?.trim() && part.name.trim() !== data.countryName?.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((part) => part.name!.trim());
  const names = administrative.length
    ? administrative.slice(-3)
    : [data.principalSubdivision, data.city, data.locality];
  const distinct = names
    .map((name) => name?.trim() ?? "")
    .filter((name, index, all) => name && all.indexOf(name) === index);
  return distinct.join("") || null;
}

export async function resolveDevicePlace(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL(REVERSE_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "zh");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;
    return formatDevicePlace((await response.json()) as DevicePlaceResponse);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
