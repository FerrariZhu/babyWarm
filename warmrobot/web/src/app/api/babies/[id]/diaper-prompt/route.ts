import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { createClient } from "@/lib/supabase/server";

type DiaperPromptAction = "shown" | "answer";
type DiaperPromptAnswer = "yes" | "no";

function isDiaperPromptAction(value: string): value is DiaperPromptAction {
  return value === "shown" || value === "answer";
}

function isDiaperPromptAnswer(value: string): value is DiaperPromptAnswer {
  return value === "yes" || value === "no";
}

async function invalidateTodayBrief(
  supabase: Awaited<ReturnType<typeof createClient>>,
  babyId: string
) {
  await supabase
    .from("home_daily_briefs")
    .delete()
    .eq("baby_id", babyId)
    .eq("recommended_date", localRecommendedDate());
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: babyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const action = body.action != null ? String(body.action) : "";
  if (!isDiaperPromptAction(action)) {
    return NextResponse.json({ error: "无效的操作" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === "shown") {
    const { data, error } = await supabase
      .from("babies")
      .update({ diaper_prompt_last_shown_at: now })
      .eq("id", babyId)
      .eq("user_id", user.id)
      .select("id, diaper_prompt_last_shown_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const answer = body.answer != null ? String(body.answer) : "";
  if (!isDiaperPromptAnswer(answer)) {
    return NextResponse.json({ error: "请选择是或否" }, { status: 400 });
  }

  const wearsDiaper = answer === "yes";
  const { data, error } = await supabase
    .from("babies")
    .update({
      wears_diaper: wearsDiaper,
      diaper_prompt_last_answer: answer,
      diaper_prompt_last_answered_at: now,
      diaper_prompt_last_shown_at: now,
    })
    .eq("id", babyId)
    .eq("user_id", user.id)
    .select(
      "id, wears_diaper, diaper_prompt_last_answer, diaper_prompt_last_answered_at, diaper_prompt_last_shown_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await invalidateTodayBrief(supabase, babyId);

  return NextResponse.json(data);
}
