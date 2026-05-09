import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, slug, image, description, parent_id")
      .order("name");

    if (error) throw error;

    // Get product count per category
    const { data: counts } = await supabase
      .from("products")
      .select("category_id")
      .eq("status", "active");

    const countMap = {};
    (counts || []).forEach((p) => {
      countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
    });

    const result = (categories || []).map((c) => ({
      ...c,
      productCount: countMap[c.id] || 0,
    }));

    return NextResponse.json({ success: true, categories: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
