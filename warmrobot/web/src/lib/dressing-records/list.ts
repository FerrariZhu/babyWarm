import {
  mapDressingRecordRow,
  type DressingRecord,
  type DressingRecordRow,
} from "@warmrobot/core";
import { requireUser } from "@/lib/supabase/session";
import { query } from "@/lib/self-hosted/database";

const RECORD_SELECT =
  "id, user_id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit";

type SelfHostedDressingRecordRow = Omit<DressingRecordRow, "recorded_date" | "saved_at"> & {
  recorded_date: string | Date;
  saved_at: string | Date;
};

function toDateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function listOwnDressingRecords(): Promise<DressingRecord[] | null> {
  const session = await requireUser();
  if (!session) return null;

  try {
    const data = await query<SelfHostedDressingRecordRow>(`SELECT ${RECORD_SELECT} FROM public.dressing_records WHERE user_id = $1 ORDER BY recorded_date DESC LIMIT 90`, [session.user.id]);
    return data.map((row) => mapDressingRecordRow({
      ...row,
      recorded_date: toDateOnly(row.recorded_date),
      saved_at: toIsoTimestamp(row.saved_at),
    }));
  } catch (error) {
    console.error("[listOwnDressingRecords]", error);
    return [];
  }
}
