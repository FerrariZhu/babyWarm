import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const STORAGE_PATH_PATTERN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:webp|png|jpg)$/;

function categoryIconDirectory() {
  const root = process.env.GUIDE_ASSET_DIR?.trim() || "/var/lib/warmrobot/guide-assets";
  return path.join(root, "category-icons");
}
function contentType(storagePath: string) {
  if (storagePath.endsWith(".webp")) return "image/webp";
  if (storagePath.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const storagePath = (await params).path.join("/");
  if (!STORAGE_PATH_PATTERN.test(storagePath)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const content = await readFile(path.join(categoryIconDirectory(), storagePath));
    return new NextResponse(content, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType(storagePath),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse(null, { status: 404 });
    }
    console.error("[category-icons] unable to read asset", error);
    return new NextResponse(null, { status: 500 });
  }
}
