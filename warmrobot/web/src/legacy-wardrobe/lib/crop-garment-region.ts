import sharp from "sharp";

export type GarmentBoundingBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const DEFAULT_PADDING = 0.02;

function getPadding(): number {
  const raw = Number(process.env.GARMENT_CROP_PADDING ?? DEFAULT_PADDING);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_PADDING;
}

export async function cropGarmentRegion(
  imageBuffer: Buffer,
  boundingBox: GarmentBoundingBox,
  padding = getPadding()
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) return imageBuffer;

  const x1 = Math.max(0, Math.floor((boundingBox.x - padding) * width));
  const y1 = Math.max(0, Math.floor((boundingBox.y - padding) * height));
  const x2 = Math.min(width, Math.ceil((boundingBox.x + boundingBox.w + padding) * width));
  const y2 = Math.min(height, Math.ceil((boundingBox.y + boundingBox.h + padding) * height));
  const cropWidth = Math.max(1, x2 - x1);
  const cropHeight = Math.max(1, y2 - y1);

  return sharp(imageBuffer)
    .extract({ left: x1, top: y1, width: cropWidth, height: cropHeight })
    .toBuffer();
}
