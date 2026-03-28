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

export async function GET() {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await ctx.admin
      .from("hero_banners")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ banners: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { title, subtitle, description, cta_label, cta_href, image_url, badge_text, badge_color, active, sort_order } = body;

    if (!title?.trim())     return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!image_url?.trim()) return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    if (!cta_href?.trim())  return NextResponse.json({ error: "CTA link is required" }, { status: 400 });

    const { data, error } = await ctx.admin
      .from("hero_banners")
      .insert({
        title:        title.trim(),
        subtitle:     subtitle?.trim() || null,
        description:  description?.trim() || null,
        cta_label:    cta_label?.trim() || "Shop Now",
        cta_href:     cta_href.trim(),
        image_url:    image_url.trim(),
        badge_text:   badge_text?.trim() || null,
        badge_color:  badge_color || "bg-primary",
        active:       active ?? true,
        sort_order:   Number(sort_order ?? 99),
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, banner: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
