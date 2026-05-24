import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hero_banners")
      .select("id, title, subtitle, description, cta_label, cta_href, image_url, badge_text, badge_color, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(5);

    if (error) throw error;
    return NextResponse.json(
      { banners: data ?? [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch {
    // Return empty so hero falls back to static slides
    return NextResponse.json({ banners: [] });
  }
}
