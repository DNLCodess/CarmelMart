import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Parallel: fetch categories + count of approved+active products per category
    const [{ data: categories, error }, { data: counts }] = await Promise.all([
      supabase.from("categories").select("id, name, slug, image, description, template, parent_id").order("name"),
      supabase.from("products").select("category_id").eq("status", "active").eq("moderation_status", "approved"),
    ]);

    if (error) throw error;

    const countMap = {};
    (counts || []).forEach((p) => {
      countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
    });

    const result = (categories || []).map((c) => ({
      ...c,
      productCount: countMap[c.id] || 0,
    }));

    return NextResponse.json(
      { success: true, categories: result },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
