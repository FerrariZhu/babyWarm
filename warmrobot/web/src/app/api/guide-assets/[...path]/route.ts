import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { queryOne } from "@/lib/self-hosted/database";

const STORAGE_PATH_PATTERN = /^[a-z][a-z0-9_]{0,63}\/[a-z][a-z0-9_]{0,63}\/[a-z][a-z0-9_]{0,63}\/[0-9a-f-]{36}\.(?:webp|png|jpg)$/;

function guideAssetDirectory() {
  return process.env.GUIDE_ASSET_DIR?.trim() || "/var/lib/warmrobot/guide-assets";
}

function guideAssetSeedDirectory() {
  return process.env.GUIDE_ASSET_SEED_DIR?.trim() ||
    path.resolve(process.cwd(), "..", "assets", "guide-image-seeds");
}

async function readGuideAsset(storagePath: string, mimeType: string) {
  try {
    return {
      content: await readFile(path.join(guideAssetDirectory(), storagePath)),
      contentType: mimeType,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const [categoryCode, axis, value] = storagePath.split("/");
  return {
    content: await readFile(path.join(guideAssetSeedDirectory(), categoryCode, axis, `${value}.png`)),
    contentType: "image/png",
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const storagePath = (await params).path.join("/");
  if (!STORAGE_PATH_PATTERN.test(storagePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const asset = await queryOne<{ mime_type: string }>(
    "SELECT mime_type FROM public.guide_visual_assets WHERE storage_path = $1 AND status = 'approved'",
    [storagePath]
  );
  if (!asset) return new NextResponse(null, { status: 404 });

  try {
    const { content, contentType } = await readGuideAsset(storagePath, asset.mime_type);
    return new NextResponse(content, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return new NextResponse(null, { status: 404 });
    console.error("[guide-assets] unable to read asset", error);
    return new NextResponse(null, { status: 500 });
  }
}
