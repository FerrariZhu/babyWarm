import { NextResponse } from "next/server";
import { formatFetchErrorMessage } from "@/lib/fetch-error";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing, error: fetchError } = await supabase
      .from("clothing_items")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "衣物不存在或已删除" }, { status: 404 });
    }

    const deletedAt = new Date().toISOString();
    const { error } = await supabase
      .from("clothing_items")
      .update({ deleted_at: deletedAt, is_available: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted_at: deletedAt });
  } catch (error) {
    console.error("[clothing delete]", error);
    return NextResponse.json(
      { error: formatFetchErrorMessage(error, "删除失败，请稍后重试") },
      { status: 503 }
    );
  }
}
