import type { DbBaby, DbCategory, DbClothingItem, DbMaterial, DbProfile, DbSizeLabel, DbThickness } from "@/lib/db/types";
import { requireUser } from "@/lib/supabase/session";

const ITEM_SELECT =
  "id, name, category, warmth_score, size_label, image_url, is_available, is_favorite, thickness, material_id, weight_grams, season_tags, breathability";

export async function getWardrobePageData() {
  const session = await requireUser();
  if (!session) return null;
  const { supabase, user } = session;

  const [{ data: profile }, { data: babies }, { data: items }, { data: materials }] =
    await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, city")
      .eq("id", user.id)
      .single<DbProfile>(),
    supabase
      .from("babies")
      .select("id, name, is_active, avatar_url, gender")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("clothing_items")
      .select(ITEM_SELECT)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("materials")
      .select("id, code, name_zh")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const baby = babies?.[0] as Pick<DbBaby, "id" | "name" | "avatar_url" | "gender"> | undefined;

  return {
    profile,
    baby,
    items: (items ?? []) as DbClothingItem[],
    materials: ((materials ?? []) as { id: string; code: string; name_zh: string }[]).map(
      (m) => ({ id: m.id, code: m.code, name: m.name_zh })
    ) as DbMaterial[],
  };
}

export async function getAddPageData() {
  const session = await requireUser();
  if (!session) return null;
  const { supabase, user } = session;

  const [
    { data: babies },
    { data: materials },
    { data: sizes },
    { data: categories },
    { data: thicknesses },
  ] = await Promise.all([
    supabase
      .from("babies")
      .select("id, name, avatar_url, gender, birth_date, height_cm, weight_kg, current_size_label")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .limit(1),
    supabase
      .from("materials")
      .select("id, code, name_zh")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("size_labels")
      .select("code, name_zh")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("categories")
      .select("code, name_zh, layer_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("thicknesses")
      .select("code, name_zh")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    baby: babies?.[0] as
      | Pick<DbBaby, "id" | "name" | "avatar_url" | "gender" | "birth_date" | "height_cm" | "weight_kg" | "current_size_label">
      | undefined,
    materials: ((materials ?? []) as { id: string; code: string; name_zh: string }[]).map(
      (m) => ({ id: m.id, code: m.code, name: m.name_zh })
    ) as DbMaterial[],
    sizes: ((sizes ?? []) as { code: string; name_zh: string }[]).map((s) => ({
      code: s.code,
      label: s.name_zh,
    })) as DbSizeLabel[],
    categories: ((categories ?? []) as { code: string; name_zh: string; layer_order: number }[]).map(
      (c) => ({ code: c.code, label: c.name_zh, layer_order: c.layer_order })
    ) as DbCategory[],
    thicknesses: ((thicknesses ?? []) as { code: string; name_zh: string }[]).map((t) => ({
      code: t.code as DbThickness["code"],
      label: t.name_zh,
    })) as DbThickness[],
  };
}
