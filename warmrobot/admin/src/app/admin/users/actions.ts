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
  type UserSignupChannel,
} from "@/lib/admin/user-types";
import { createServiceClient } from "@/lib/supabase/service";

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
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
  created_at: string;
  updated_at: string;
};

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
    created_at: row.created_at,
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
    created_at: row.created_at,
    fromApp: false,
  };
}

function resolveSignupChannel(
  metadata: Record<string, unknown> | undefined
): UserSignupChannel {
  const channel = metadata?.signup_channel;
  if (channel === "miniprogram") return "miniprogram";
  // 未来：if (channel === "h5") return "h5";
  return "miniprogram";
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
    created_at: profile.created_at,
    updated_at: profile.updated_at,
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
    created_at: row.created_at,
    updated_at: row.updated_at,
    babies: baby ? [baby] : [],
  };
}

function manualRowPayload(input: SaveManualUserInput): Record<string, unknown> {
  const parent_name = input.parent_name.trim();
  return {
    parent_name,
    wechat_id: input.wechat_id?.trim() || null,
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    admin_notes: input.admin_notes?.trim() || null,
    baby_name: input.baby_name?.trim() || null,
    baby_birth_date: input.baby_birth_date?.trim() || null,
    baby_gender: input.baby_gender?.trim() || null,
    baby_height_cm: input.baby_height_cm ?? null,
    baby_weight_kg: input.baby_weight_kg ?? null,
    baby_warmth_preference: input.baby_warmth_preference?.trim() || null,
  };
}

export async function listAdminUsers(): Promise<ActionResult<AdminUserRecord[]>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const supabase = createServiceClient();

    const emailById = new Map<string, string | null>();
    const signupChannelById = new Map<string, UserSignupChannel>();
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data: authPage, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (authError) return { ok: false, error: authError.message };

      for (const user of authPage.users) {
        emailById.set(user.id, user.email ?? null);
        signupChannelById.set(
          user.id,
          resolveSignupChannel(user.user_metadata as Record<string, unknown> | undefined)
        );
      }

      if (authPage.users.length < perPage) break;
      page += 1;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, city, latitude, longitude, wechat_id, wechat_openid, wechat_unionid, admin_notes, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (profileError) return { ok: false, error: profileError.message };

    const { data: babies, error: babyError } = await supabase
      .from("babies")
      .select(
        `
        id,
        user_id,
        name,
        birth_date,
        gender,
        activity_level,
        height_cm,
        weight_kg,
        is_active,
        notes,
        created_at,
        baby_warmth_preferences (
          warmth_preference,
          warmth_offset
        )
      `
      )
      .order("created_at", { ascending: true });

    if (babyError) return { ok: false, error: babyError.message };

    const { data: manualRows, error: manualError } = await supabase
      .from("admin_user_info_records")
      .select(
        "id, parent_name, wechat_id, email, city, admin_notes, baby_name, baby_birth_date, baby_gender, baby_height_cm, baby_weight_kg, baby_warmth_preference, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (manualError) return { ok: false, error: manualError.message };

    const babiesByUser = new Map<string, AdminBabyRecord[]>();
    for (const row of (babies ?? []) as BabyRow[]) {
      const list = babiesByUser.get(row.user_id) ?? [];
      list.push(mapBaby(row));
      babiesByUser.set(row.user_id, list);
    }

    const records: AdminUserRecord[] = ((profiles ?? []) as ProfileRow[]).map((profile) =>
      mapAppUser(
        profile,
        emailById.get(profile.id) ?? null,
        babiesByUser.get(profile.id) ?? [],
        signupChannelById.get(profile.id)
      )
    );

    for (const [id, email] of emailById) {
      if (records.some((r) => r.id === id)) continue;
      records.push(
        mapAppUser(
          {
            id,
            display_name: null,
            avatar_url: null,
            city: null,
            latitude: null,
            longitude: null,
            wechat_id: null,
            wechat_openid: null,
            wechat_unionid: null,
            admin_notes: null,
            created_at: "",
            updated_at: "",
          },
          email,
          babiesByUser.get(id) ?? [],
          signupChannelById.get(id)
        )
      );
    }

    for (const row of (manualRows ?? []) as ManualRow[]) {
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
    const supabase = createServiceClient();
    const patch = {
      display_name: input.display_name?.trim() || null,
      wechat_id: input.wechat_id?.trim() || null,
      wechat_openid: input.wechat_openid?.trim() || null,
      wechat_unionid: input.wechat_unionid?.trim() || null,
      city: input.city?.trim() || null,
      admin_notes: input.admin_notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", input.id)
      .select(
        "id, display_name, avatar_url, city, latitude, longitude, wechat_id, wechat_openid, wechat_unionid, admin_notes, created_at, updated_at"
      )
      .single();

    if (error) return { ok: false, error: error.message };

    const { data: authUser } = await supabase.auth.admin.getUserById(input.id);
    const signupChannel = resolveSignupChannel(
      authUser.user?.user_metadata as Record<string, unknown> | undefined
    );

    const { data: babies } = await supabase
      .from("babies")
      .select(
        `
        id, user_id, name, birth_date, gender, activity_level, height_cm, weight_kg, is_active, notes, created_at,
        baby_warmth_preferences ( warmth_preference, warmth_offset )
      `
      )
      .eq("user_id", input.id)
      .order("created_at", { ascending: true });

    revalidatePath("/admin/users");
    return {
      ok: true,
      data: mapAppUser(
        data as ProfileRow,
        authUser.user?.email ?? null,
        ((babies ?? []) as BabyRow[]).map(mapBaby),
        signupChannel
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
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_user_info_records")
      .insert(manualRowPayload({ ...input, parent_name }))
      .select(
        "id, parent_name, wechat_id, email, city, admin_notes, baby_name, baby_birth_date, baby_gender, baby_height_cm, baby_weight_kg, baby_warmth_preference, created_at, updated_at"
      )
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true, data: mapManualUser(data as ManualRow) };
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
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_user_info_records")
      .update(manualRowPayload({ ...input, parent_name }))
      .eq("id", input.id)
      .select(
        "id, parent_name, wechat_id, email, city, admin_notes, baby_name, baby_birth_date, baby_gender, baby_height_cm, baby_weight_kg, baby_warmth_preference, created_at, updated_at"
      )
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true, data: mapManualUser(data as ManualRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteManualUserRecord(id: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("admin_user_info_records").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

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
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("dressing_records")
      .select(
        "id, baby_id, baby_name, recorded_date, saved_at, required_warmth, reason, location_label, weather, outfit"
      )
      .eq("user_id", userId)
      .order("recorded_date", { ascending: false })
      .limit(90);

    if (error) return { ok: false, error: error.message };

    const records: AdminDressingRecord[] = (data ?? []).map((row) => {
      const weather = (row.weather ?? null) as { conditionText?: string; temp?: number } | null;
      const outfit = (row.outfit ?? {}) as OutfitSnapshot;
      return {
        id: row.id as string,
        babyId: row.baby_id as string,
        babyName: (row.baby_name as string) || "—",
        recordedDate: row.recorded_date as string,
        savedAt: row.saved_at as string,
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
