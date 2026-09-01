import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeProductParse,
  parseProductFromScreenshot,
} from "@/legacy-wardrobe/lib/product-parse-pipeline";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const maxDuration = 600;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("image");
  const linkedUrl = (form.get("source_url") as string | null)?.trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传商品页截图" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 截图" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "截图请小于 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const draft = await parseProductFromScreenshot(base64, file.type, linkedUrl);

    const { apiResponse } = await completeProductParse(
      supabase,
      user.id,
      linkedUrl || `screenshot://${file.name}`,
      draft,
      { linkedUrl, sourceImageBuffer: buffer, sourceMimeType: file.type }
    );

    return NextResponse.json(apiResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "截图识别失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
