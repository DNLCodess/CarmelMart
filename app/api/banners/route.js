import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("hero_banners")
      .select("id, title, subtitle, description, cta_label, cta_href, image_url, badge_text, badge_color, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(5);

    if (error) throw error;
    return NextResponse.json({ banners: data ?? [] });
  } catch {
    // Return empty so hero falls back to static slides
    return NextResponse.json({ banners: [] });
  }
}
