import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return { user, admin };
}

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const update = {};

    if (body.active     !== undefined) update.active         = Boolean(body.active);
    if (body.title      !== undefined) update.title          = body.title.trim();
    if (body.ends_at    !== undefined) update.ends_at        = body.ends_at;
    if (body.starts_at  !== undefined) update.starts_at      = body.starts_at;

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const { error } = await ctx.admin.from("flash_sales").update(update).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { error } = await ctx.admin.from("flash_sales").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
