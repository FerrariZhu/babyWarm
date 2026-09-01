import {
  mapDressingRecordRow,
  type DressingRecord,
  type DressingRecordRow,
} from "@warmrobot/core";
import { requireUser } from "@/lib/supabase/session";

const RECORD_SELECT =
  "id, user_id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit";

export async function listOwnDressingRecords(): Promise<DressingRecord[] | null> {
  const session = await requireUser();
  if (!session) return null;

  const { data, error } = await session.supabase
    .from("dressing_records")
    .select(RECORD_SELECT)
    .eq("user_id", session.user.id)
    .order("recorded_date", { ascending: false })
    .limit(90);

  if (error) {
    console.error("[listOwnDressingRecords]", error.message);
    return [];
  }

  return ((data ?? []) as DressingRecordRow[]).map(mapDressingRecordRow);
}
