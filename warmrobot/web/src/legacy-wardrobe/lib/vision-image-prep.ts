import sharp from "sharp";

const DEFAULT_MAX_EDGE = 1280;

function getMaxVisionEdge(): number {
  const raw = Number(process.env.VISION_IMAGE_MAX_EDGE ?? DEFAULT_MAX_EDGE);
  return Number.isFinite(raw) && raw >= 512 ? Math.round(raw) : DEFAULT_MAX_EDGE;
}

export async function prepareVisionImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; resized: boolean }> {
  const maxEdge = getMaxVisionEdge();
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxEdge) {
    return { buffer, mimeType, resized: false };
  }

  const resized = await sharp(buffer)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return { buffer: resized, mimeType: "image/jpeg", resized: true };
}

export async function prepareVisionImageBase64(
  buffer: Buffer,
  mimeType: string
): Promise<{ base64: string; mimeType: string; resized: boolean }> {
  const prepared = await prepareVisionImage(buffer, mimeType);
  return {
    base64: prepared.buffer.toString("base64"),
    mimeType: prepared.mimeType,
    resized: prepared.resized,
  };
}
