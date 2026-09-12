import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { localRecommendedDate } from "@/lib/daily-brief/format";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { queryOne, query } from "@/lib/self-hosted/database";

type DiaperPromptAction = "shown" | "answer";
type DiaperPromptAnswer = "yes" | "no";

function isDiaperPromptAction(value: string): value is DiaperPromptAction {
  return value === "shown" || value === "answer";
}

function isDiaperPromptAnswer(value: string): value is DiaperPromptAnswer {
  return value === "yes" || value === "no";
}

async function invalidateTodayBrief(babyId: string) {
  await query(
    "DELETE FROM public.home_daily_briefs WHERE baby_id = $1 AND recommended_date = $2",
    [babyId, localRecommendedDate()]
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: babyId } = await params;
  const user = await getCurrentUser();
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
    const data = await queryOne<{ id: string; diaper_prompt_last_shown_at: string | null }>(
      `UPDATE public.babies SET diaper_prompt_last_shown_at = $1, updated_at = now()
        WHERE id = $2 AND user_id = $3
        RETURNING id, diaper_prompt_last_shown_at`,
      [now, babyId, user.id]
    );
    if (!data) return NextResponse.json({ error: "找不到宝宝档案" }, { status: 404 });
    return NextResponse.json(data);
  }

  const answer = body.answer != null ? String(body.answer) : "";
  if (!isDiaperPromptAnswer(answer)) {
    return NextResponse.json({ error: "请选择是或否" }, { status: 400 });
  }

  const wearsDiaper = answer === "yes";
  const data = await queryOne<{
    id: string;
    wears_diaper: boolean | null;
    diaper_prompt_last_answer: DiaperPromptAnswer | null;
    diaper_prompt_last_answered_at: string | null;
    diaper_prompt_last_shown_at: string | null;
  }>(
    `UPDATE public.babies
        SET wears_diaper = $1, diaper_prompt_last_answer = $2,
            diaper_prompt_last_answered_at = $3, diaper_prompt_last_shown_at = $3, updated_at = now()
      WHERE id = $4 AND user_id = $5
      RETURNING id, wears_diaper, diaper_prompt_last_answer, diaper_prompt_last_answered_at, diaper_prompt_last_shown_at`,
    [wearsDiaper, answer, now, babyId, user.id]
  );
  if (!data) return NextResponse.json({ error: "找不到宝宝档案" }, { status: 404 });

  await invalidateTodayBrief(babyId);

  return NextResponse.json(data);
}
