import type { SupabaseClient } from "@supabase/supabase-js";

export const CLOTHING_IMAGES_BUCKET = "clothing-images";

export function buildClothingImageObjectKey(userId: string, suffix: string): string {
  const normalized = suffix.replace(/^\/+/, "");
  return `${userId}/${normalized}`;
}

export function getClothingImagePublicUrl(
  supabase: SupabaseClient,
  objectKey: string
): string {
  const { data } = supabase.storage.from(CLOTHING_IMAGES_BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

export async function uploadClothingImage(
  supabase: SupabaseClient,
  userId: string,
  objectKeySuffix: string,
  buffer: Buffer,
  contentType = "image/webp"
): Promise<string | null> {
  const objectKey = buildClothingImageObjectKey(userId, objectKeySuffix);

  const { error } = await supabase.storage.from(CLOTHING_IMAGES_BUCKET).upload(objectKey, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error("[clothing-image-storage] upload failed:", error.message);
    return null;
  }

  return getClothingImagePublicUrl(supabase, objectKey);
}

export async function downloadStorageObject(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) {
    console.error("[clothing-image-storage] download failed:", error?.message);
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function copyClothingImageToItem(
  supabase: SupabaseClient,
  userId: string,
  sourceSuffix: string,
  itemId: string
): Promise<string | null> {
  const sourceKey = buildClothingImageObjectKey(userId, sourceSuffix);
  const { data, error } = await supabase.storage.from(CLOTHING_IMAGES_BUCKET).download(sourceKey);
  if (error || !data) {
    console.error("[clothing-image-storage] copy source missing:", error?.message);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return uploadClothingImage(supabase, userId, `${itemId}.webp`, buffer, "image/webp");
}

export async function fetchRemoteImage(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return null;

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) return null;
    return { buffer, mimeType };
  } catch (error) {
    console.error("[clothing-image-storage] fetch remote failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
