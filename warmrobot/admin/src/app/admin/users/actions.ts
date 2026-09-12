"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  type AdminBabyRecord,
  type AdminDressingRecord,
  type AdminUserRecord,
  type SaveAppUserInput,
  type SaveManualUserInput,
  type UpdateManualUserInput,
  type UserLoginChannel,
  type UserSignupChannel,
} from "@/lib/admin/user-types";
import { query, queryOne } from "@/lib/self-hosted/database";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) {
    return { ok: false, error: "无权限：需要管理员登录（ADMIN_EMAILS）" };
  }
  return { ok: true, data: undefined };
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  wechat_id: string | null;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  admin_notes: string | null;
  last_login_channel: UserLoginChannel | null;
  last_login_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type BabyRow = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  gender: string | null;
  activity_level: string;
  height_cm: number | null;
  weight_kg: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string | Date;
  baby_warmth_preferences:
    | {
        warmth_preference: string | null;
        warmth_offset: number | null;
      }[]
    | {
        warmth_preference: string | null;
        warmth_offset: number | null;
      }
    | null;
};

type ManualRow = {
  id: string;
  parent_name: string;
  wechat_id: string | null;
  email: string | null;
  city: string | null;
  admin_notes: string | null;
  baby_name: string | null;
  baby_birth_date: string | null;
  baby_gender: string | null;
  baby_height_cm: number | null;
  baby_weight_kg: number | null;
  baby_warmth_preference: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type AccountRow = {
  id: string;
  email: string | null;
  created_at: string | Date;
};

const PROFILE_SELECT =
  "id, display_name, avatar_url, city, latitude, longitude, wechat_id, wechat_openid, wechat_unionid, admin_notes, last_login_channel, last_login_at, created_at, updated_at";
const MANUAL_SELECT =
  "id, parent_name, wechat_id, email, city, admin_notes, baby_name, baby_birth_date, baby_gender, baby_height_cm, baby_weight_kg, baby_warmth_preference, created_at, updated_at";
const BABY_SELECT = `b.id, b.user_id, b.name, b.birth_date::text, b.gender, b.activity_level,
  b.height_cm, b.weight_kg, b.is_active, b.notes, b.created_at,
  CASE WHEN p.baby_id IS NULL THEN NULL ELSE jsonb_build_object(
    'warmth_preference', p.warmth_preference,
    'warmth_offset', p.warmth_offset
  ) END AS baby_warmth_preferences`;

function timestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function nullableTimestamp(value: string | Date | null): string | null {
  return value === null ? null : timestamp(value);
}

function mapBaby(row: BabyRow): AdminBabyRecord {
  const prefs = Array.isArray(row.baby_warmth_preferences)
    ? row.baby_warmth_preferences[0]
    : row.baby_warmth_preferences;

  return {
    id: row.id,
    name: row.name,
    birth_date: row.birth_date,
    gender: row.gender,
    activity_level: row.activity_level,
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
    is_active: row.is_active,
    notes: row.notes,
    warmth_preference: prefs?.warmth_preference ?? null,
    warmth_offset: prefs?.warmth_offset != null ? Number(prefs.warmth_offset) : null,
    created_at: timestamp(row.created_at),
    fromApp: true,
  };
}

function mapManualBaby(row: ManualRow): AdminBabyRecord | null {
  if (!row.baby_name?.trim()) return null;
  return {
    id: `${row.id}-manual-baby`,
    name: row.baby_name,
    birth_date: row.baby_birth_date ?? "",
    gender: row.baby_gender,
    activity_level: "low",
    height_cm: row.baby_height_cm != null ? Number(row.baby_height_cm) : null,
    weight_kg: row.baby_weight_kg != null ? Number(row.baby_weight_kg) : null,
    is_active: true,
    notes: null,
    warmth_preference: row.baby_warmth_preference,
    warmth_offset: null,
    created_at: timestamp(row.created_at),
    fromApp: false,
  };
}

function mapAppUser(
  profile: ProfileRow,
  email: string | null,
  babies: AdminBabyRecord[],
  signupChannel: UserSignupChannel = "miniprogram"
): AdminUserRecord {
  return {
    id: profile.id,
    source: signupChannel,
    email,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    city: profile.city,
    latitude: profile.latitude != null ? Number(profile.latitude) : null,
    longitude: profile.longitude != null ? Number(profile.longitude) : null,
    wechat_id: profile.wechat_id,
    wechat_openid: profile.wechat_openid,
    wechat_unionid: profile.wechat_unionid,
    admin_notes: profile.admin_notes,
    last_login_channel: profile.last_login_channel,
    last_login_at: nullableTimestamp(profile.last_login_at),
    created_at: timestamp(profile.created_at),
    updated_at: timestamp(profile.updated_at),
    babies,
  };
}

function mapManualUser(row: ManualRow): AdminUserRecord {
  const baby = mapManualBaby(row);
  return {
    id: row.id,
    source: "manual",
    email: row.email,
    display_name: row.parent_name,
    avatar_url: null,
    city: row.city,
    latitude: null,
    longitude: null,
    wechat_id: row.wechat_id,
    wechat_openid: null,
    wechat_unionid: null,
    admin_notes: row.admin_notes,
    last_login_channel: null,
    last_login_at: null,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
    babies: baby ? [baby] : [],
  };
}

function manualRowValues(input: SaveManualUserInput): unknown[] {
  return [
    input.parent_name.trim(),
    input.wechat_id?.trim() || null,
    input.email?.trim() || null,
    input.city?.trim() || null,
    input.admin_notes?.trim() || null,
    input.baby_name?.trim() || null,
    input.baby_birth_date?.trim() || null,
    input.baby_gender?.trim() || null,
    input.baby_height_cm ?? null,
    input.baby_weight_kg ?? null,
    input.baby_warmth_preference?.trim() || null,
  ];
}

export async function listAdminUsers(): Promise<ActionResult<AdminUserRecord[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const [accounts, profiles, babies, manualRows] = await Promise.all([
      query<AccountRow>("SELECT id, email, created_at FROM public.app_accounts ORDER BY created_at DESC"),
      query<ProfileRow>(`SELECT ${PROFILE_SELECT} FROM public.profiles ORDER BY created_at DESC`),
      query<BabyRow>(
        `SELECT ${BABY_SELECT}
           FROM public.babies b
           LEFT JOIN public.baby_warmth_preferences p ON p.baby_id = b.id
          ORDER BY b.created_at ASC`
      ),
      query<ManualRow>(`SELECT ${MANUAL_SELECT} FROM public.admin_user_info_records ORDER BY created_at DESC`),
    ]);

    const accountById = new Map(accounts.map((account) => [account.id, account]));

    const babiesByUser = new Map<string, AdminBabyRecord[]>();
    for (const row of babies) {
      const list = babiesByUser.get(row.user_id) ?? [];
      list.push(mapBaby(row));
      babiesByUser.set(row.user_id, list);
    }

    const records: AdminUserRecord[] = profiles.map((profile) =>
      mapAppUser(
        profile,
        accountById.get(profile.id)?.email ?? null,
        babiesByUser.get(profile.id) ?? [],
        "miniprogram"
      )
    );

    for (const account of accounts) {
      if (records.some((record) => record.id === account.id)) continue;
      records.push(
        mapAppUser(
          {
            id: account.id,
            display_name: null,
            avatar_url: null,
            city: null,
            latitude: null,
            longitude: null,
            wechat_id: null,
            wechat_openid: null,
            wechat_unionid: null,
            admin_notes: null,
            last_login_channel: null,
            last_login_at: null,
            created_at: timestamp(account.created_at),
            updated_at: timestamp(account.created_at),
          },
          account.email,
          babiesByUser.get(account.id) ?? [],
          "miniprogram"
        )
      );
    }

    for (const row of manualRows) {
      records.push(mapManualUser(row));
    }

    records.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return { ok: true, data: records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载用户失败" };
  }
}

export async function saveAppUserProfile(
  input: SaveAppUserInput
): Promise<ActionResult<AdminUserRecord>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const data = await queryOne<ProfileRow>(
      `UPDATE public.profiles
          SET display_name = $1,
              wechat_id = $2,
              wechat_openid = $3,
              wechat_unionid = $4,
              city = $5,
              admin_notes = $6,
              updated_at = now()
        WHERE id = $7
        RETURNING ${PROFILE_SELECT}`,
      [
        input.display_name?.trim() || null,
        input.wechat_id?.trim() || null,
        input.wechat_openid?.trim() || null,
        input.wechat_unionid?.trim() || null,
        input.city?.trim() || null,
        input.admin_notes?.trim() || null,
        input.id,
      ]
    );
    if (!data) return { ok: false, error: "用户不存在" };
    const account = await queryOne<{ email: string | null }>(
      "SELECT email FROM public.app_accounts WHERE id = $1",
      [input.id]
    );
    const babies = await query<BabyRow>(
      `SELECT ${BABY_SELECT}
         FROM public.babies b
         LEFT JOIN public.baby_warmth_preferences p ON p.baby_id = b.id
        WHERE b.user_id = $1
        ORDER BY b.created_at ASC`,
      [input.id]
    );

    revalidatePath("/admin/users");
    return {
      ok: true,
      data: mapAppUser(
        data,
        account?.email ?? null,
        babies.map(mapBaby),
        "miniprogram"
      ),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function createManualUserRecord(
  input: SaveManualUserInput
): Promise<ActionResult<AdminUserRecord>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const parent_name = input.parent_name.trim();
  if (!parent_name) return { ok: false, error: "用户名称不能为空" };

  try {
    const data = await queryOne<ManualRow>(
      `INSERT INTO public.admin_user_info_records
        (parent_name, wechat_id, email, city, admin_notes, baby_name, baby_birth_date,
         baby_gender, baby_height_cm, baby_weight_kg, baby_warmth_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${MANUAL_SELECT}`,
      manualRowValues({ ...input, parent_name })
    );
    if (!data) return { ok: false, error: "创建失败" };

    revalidatePath("/admin/users");
    return { ok: true, data: mapManualUser(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateManualUserRecord(
  input: UpdateManualUserInput
): Promise<ActionResult<AdminUserRecord>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const parent_name = input.parent_name.trim();
  if (!parent_name) return { ok: false, error: "用户名称不能为空" };

  try {
    const values = manualRowValues({ ...input, parent_name });
    const data = await queryOne<ManualRow>(
      `UPDATE public.admin_user_info_records
          SET parent_name = $1, wechat_id = $2, email = $3, city = $4,
              admin_notes = $5, baby_name = $6, baby_birth_date = $7,
              baby_gender = $8, baby_height_cm = $9, baby_weight_kg = $10,
              baby_warmth_preference = $11, updated_at = now()
        WHERE id = $12
        RETURNING ${MANUAL_SELECT}`,
      [...values, input.id]
    );
    if (!data) return { ok: false, error: "记录不存在" };

    revalidatePath("/admin/users");
    return { ok: true, data: mapManualUser(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteManualUserRecord(id: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    await query("DELETE FROM public.admin_user_info_records WHERE id = $1", [id]);

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}

type OutfitLabelItem = { label?: string };
type OutfitExtra = { type?: string; item?: OutfitLabelItem };
type OutfitSnapshot = {
  indoorItems?: OutfitLabelItem[];
  outdoorAdditions?: OutfitLabelItem[];
  extras?: OutfitExtra[];
};

function joinLabels(items: OutfitLabelItem[] | undefined): string {
  return (items ?? [])
    .map((item) => item.label?.trim() ?? "")
    .filter(Boolean)
    .join("、");
}

function joinExtras(extras: OutfitExtra[] | undefined): string {
  return (extras ?? [])
    .map((extra) => extra.item?.label?.trim() || extra.type?.trim() || "")
    .filter(Boolean)
    .join("、");
}

export async function listUserDressingRecords(
  userId: string
): Promise<ActionResult<AdminDressingRecord[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  if (!userId.trim()) return { ok: false, error: "缺少用户 ID" };

  try {
    const data = await query<{
      id: string;
      baby_id: string;
      baby_name: string;
      recorded_date: string;
      saved_at: string | Date;
      required_warmth: number;
      reason: string | null;
      location_label: string | null;
      weather: unknown;
      outfit: unknown;
    }>(
      `SELECT id, baby_id, baby_name, recorded_date::text, saved_at, required_warmth,
              reason, location_label, weather, outfit
         FROM public.dressing_records
        WHERE user_id = $1
        ORDER BY recorded_date DESC
        LIMIT 90`,
      [userId]
    );

    const records: AdminDressingRecord[] = data.map((row) => {
      const weather = (row.weather ?? null) as { conditionText?: string; temp?: number } | null;
      const outfit = (row.outfit ?? {}) as OutfitSnapshot;
      return {
        id: row.id as string,
        babyId: row.baby_id as string,
        babyName: (row.baby_name as string) || "—",
        recordedDate: row.recorded_date as string,
        savedAt: timestamp(row.saved_at),
        requiredWarmth: Number(row.required_warmth),
        reason: (row.reason as string) ?? "",
        locationLabel: (row.location_label as string) ?? null,
        conditionText: weather?.conditionText ?? null,
        temp: weather?.temp != null ? Number(weather.temp) : null,
        indoorSummary: joinLabels(outfit.indoorItems),
        outdoorSummary: joinLabels(outfit.outdoorAdditions),
        extrasSummary: joinExtras(outfit.extras),
      };
    });

    return { ok: true, data: records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载穿衣记录失败" };
  }
}
