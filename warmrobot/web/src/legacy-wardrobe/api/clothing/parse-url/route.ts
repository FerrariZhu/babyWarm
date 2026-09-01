import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { createClient } from "@/lib/supabase/server";
import { splitPastedProductInput } from "@/legacy-wardrobe/lib/taobao-product-parser";
import {
  completeProductParse,
  parseProductFromUrl,
} from "@/legacy-wardrobe/lib/product-parse-pipeline";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jsonParsed = await parseJsonBody<{
    source_url?: string;
    title_hint?: string | null;
  }>(request);
  if (!jsonParsed.ok) return jsonParsed.response;
  const body = jsonParsed.body;

  const rawInput = body.source_url?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { sourceUrl, titleHint: shareTitle } = splitPastedProductInput(rawInput);
  const titleHint = body.title_hint?.trim() || shareTitle;
  const draft = await parseProductFromUrl(sourceUrl, titleHint);

  const { apiResponse } = await completeProductParse(
    supabase,
    user.id,
    draft.canonicalUrl || sourceUrl,
    draft,
    { linkedUrl: sourceUrl }
  );

  return NextResponse.json(apiResponse);
}
