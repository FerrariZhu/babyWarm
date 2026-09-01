import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prepareVisionImageBase64 } from "@/legacy-wardrobe/lib/vision-image-prep";
import { classifyPhotoScene } from "@/legacy-wardrobe/lib/vision-photo-scene";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传照片" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 图片" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "图片请小于 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { base64, mimeType } = await prepareVisionImageBase64(buffer, file.type);
    const result = await classifyPhotoScene(base64, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "场景分类失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
