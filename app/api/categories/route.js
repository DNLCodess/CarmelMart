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

    // Build direct counts per category_id
    const countMap = {};
    (counts || []).forEach((p) => {
      if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
    });

    // Index parent categories for template inheritance lookup
    const parentMap = {};
    (categories || []).forEach((c) => { if (!c.parent_id) parentMap[c.id] = c; });

    // Roll up subcategory counts into each parent + resolve effectiveTemplate
    const result = (categories || []).map((c) => {
      let productCount = countMap[c.id] || 0;
      if (!c.parent_id) {
        // Add counts from all children of this parent
        (categories || []).forEach((sub) => {
          if (sub.parent_id === c.id) productCount += countMap[sub.id] || 0;
        });
      }
      // effectiveTemplate: subcategory falls back to parent's template when its own is null
      const effectiveTemplate = c.template ?? parentMap[c.parent_id]?.template ?? "standard";
      return { ...c, effectiveTemplate, productCount };
    });

    return NextResponse.json(
      { success: true, categories: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
