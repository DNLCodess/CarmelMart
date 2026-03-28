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
    const { title, subtitle, description, cta_label, cta_href, image_url, badge_text, badge_color, active, sort_order } = body;

    const update = { updated_at: new Date().toISOString() };
    if (title        !== undefined) update.title        = title?.trim() || null;
    if (subtitle     !== undefined) update.subtitle     = subtitle?.trim() || null;
    if (description  !== undefined) update.description  = description?.trim() || null;
    if (cta_label    !== undefined) update.cta_label    = cta_label?.trim() || "Shop Now";
    if (cta_href     !== undefined) update.cta_href     = cta_href?.trim() || null;
    if (image_url    !== undefined) update.image_url    = image_url?.trim() || null;
    if (badge_text   !== undefined) update.badge_text   = badge_text?.trim() || null;
    if (badge_color  !== undefined) update.badge_color  = badge_color;
    if (active       !== undefined) update.active       = active;
    if (sort_order   !== undefined) update.sort_order   = Number(sort_order);

    const { error } = await ctx.admin.from("hero_banners").update(update).eq("id", id);
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
    const { error } = await ctx.admin.from("hero_banners").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
