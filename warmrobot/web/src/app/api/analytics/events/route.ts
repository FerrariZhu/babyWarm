import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { parseAnalyticsEvent } from "@/lib/analytics/event";
import { getCurrentUser } from "@/lib/self-hosted/auth";
import { query } from "@/lib/self-hosted/database";

export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const event = parseAnalyticsEvent(parsedBody.body);
  if (!event) return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });

  const user = await getCurrentUser();
  try {
    await query(
      `INSERT INTO public.analytics_events
        (event_type, page_path, module_name, action_name, visitor_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.eventType,
        event.pagePath,
        event.moduleName,
        event.actionName,
        event.visitorId,
        user?.id ?? null,
      ]
    );
  } catch (error) {
    console.error("[analytics/events]", error);
    return NextResponse.json({ error: "Unable to record analytics event" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
