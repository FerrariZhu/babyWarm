import sharp from "sharp";
import { cropGarmentRegion, type GarmentBoundingBox } from "@/legacy-wardrobe/lib/crop-garment-region";
import { buildGarmentPreserveHint } from "@/legacy-wardrobe/lib/garment-preserve-hint";

export type { GarmentBoundingBox };

export type ProcessGarmentImageInput = {
  imageBuffer: Buffer;
  mimeType?: string;
  boundingBox?: GarmentBoundingBox | null;
  preserveHint?: string | null;
  category?: string | null;
  name?: string | null;
  regionDescription?: string | null;
  colorHint?: string | null;
};

export type ProcessGarmentImageResult = {
  buffer: Buffer;
  mimeType: "image/webp";
  warning?: string;
  beautified: boolean;
};

const DEFAULT_CANVAS_SIZE = 800;
const MAX_CANVAS_SIZE = 800;
const CANVAS_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };
const CARD_MARGIN_RATIO = 0.04;

function getCanvasSize(): number {
  const raw = Number(process.env.GARMENT_IMAGE_SIZE ?? DEFAULT_CANVAS_SIZE);
  const size = Number.isFinite(raw) && raw >= 128 ? Math.round(raw) : DEFAULT_CANVAS_SIZE;
  return Math.min(size, MAX_CANVAS_SIZE);
}

async function trimSubjectBounds(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return sharp(imageBuffer).trim({ background: "#ffffff", threshold: 15 }).toBuffer();
  } catch {
    return imageBuffer;
  }
}

async function composeSubjectCard(subjectBuffer: Buffer): Promise<Buffer> {
  const canvasSize = getCanvasSize();
  const maxSubject = Math.round(canvasSize * (1 - CARD_MARGIN_RATIO * 2));

  const trimmed = await trimSubjectBounds(subjectBuffer);

  const resizedSubject = await sharp(trimmed)
    .resize({
      width: maxSubject,
      height: maxSubject,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const subjectMeta = await sharp(resizedSubject).metadata();
  const subjectWidth = subjectMeta.width ?? maxSubject;
  const subjectHeight = subjectMeta.height ?? maxSubject;

  const left = Math.round((canvasSize - subjectWidth) / 2);
  const top = Math.round((canvasSize - subjectHeight) / 2);

  const background = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: CANVAS_BACKGROUND,
    },
  })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: resizedSubject, left, top }])
    .webp({ quality: 88 })
    .toBuffer();
}

async function applyWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer).flatten({ background: "#ffffff" }).png().toBuffer();
}

export async function processGarmentImage(
  input: ProcessGarmentImageInput
): Promise<ProcessGarmentImageResult> {
  let working = input.imageBuffer;
  if (input.boundingBox) {
    working = await cropGarmentRegion(working, input.boundingBox);
  }

  const { beautifyGarmentImage, isBeautifyConfigured } = await import(
    "@/legacy-wardrobe/lib/garment-beautify-client"
  );

  if (isBeautifyConfigured()) {
    try {
      const preserveHint =
        input.preserveHint ??
        buildGarmentPreserveHint({
          category: input.category,
          name: input.name,
          regionDescription: input.regionDescription,
          colorHint: input.colorHint,
        });
      const beautified = await beautifyGarmentImage(working, {
        mimeType: input.mimeType ?? "image/jpeg",
        preserveHint,
      });
      const buffer = await composeSubjectCard(beautified);
      return { buffer, mimeType: "image/webp", beautified: true };
    } catch (error) {
      const warning = error instanceof Error ? error.message : "云美化失败";
      working = await applyWhiteBackground(working);
      const buffer = await composeSubjectCard(working);
      return { buffer, mimeType: "image/webp", warning, beautified: false };
    }
  }

  working = await applyWhiteBackground(working);
  const buffer = await composeSubjectCard(working);
  return { buffer, mimeType: "image/webp", beautified: false };
}

export async function processGarmentImagesWithConcurrency<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency = 4
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
}

export async function beautifyStoredGarmentImage(
  imageBuffer: Buffer,
  mimeType = "image/webp"
): Promise<{ buffer: Buffer; beautified: boolean; warning?: string }> {
  const { beautifyGarmentImage, isBeautifyConfigured } = await import(
    "@/legacy-wardrobe/lib/garment-beautify-client"
  );
  if (!isBeautifyConfigured()) {
    return { buffer: imageBuffer, beautified: false };
  }

  try {
    const beautified = await beautifyGarmentImage(imageBuffer, { mimeType });
    const buffer = await composeSubjectCard(beautified);
    return { buffer, beautified: true };
  } catch (error) {
    return {
      buffer: imageBuffer,
      beautified: false,
      warning: error instanceof Error ? error.message : "云美化失败",
    };
  }
}
