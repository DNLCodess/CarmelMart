import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { user, admin };
}

export async function GET() {
  try {
    const ctx = await requireAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: categories } = await ctx.admin
      .from("categories")
      .select("id, name, slug, parent_id, image, template, created_at")
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    // Count only live products (active + approved) per category
    const { data: counts } = await ctx.admin
      .from("products")
      .select("category_id")
      .eq("status", "active")
      .eq("moderation_status", "approved");

    // Build direct counts per category_id
    const countMap = {};
    (counts || []).forEach(({ category_id }) => {
      if (category_id) countMap[category_id] = (countMap[category_id] ?? 0) + 1;
    });

    // Index parents for template inheritance
    const parentMap = {};
    (categories || []).forEach((c) => { if (!c.parent_id) parentMap[c.id] = c; });

    // Roll up subcategory counts into each parent
    const list = (categories || []).map((c) => {
      let productCount = countMap[c.id] ?? 0;
      if (!c.parent_id) {
        (categories || []).forEach((sub) => {
          if (sub.parent_id === c.id) productCount += countMap[sub.id] ?? 0;
        });
      }
      // effectiveTemplate: null means inherit from parent
      const effectiveTemplate = c.template ?? parentMap[c.parent_id]?.template ?? "standard";
      return {
        id:               c.id,
        name:             c.name,
        slug:             c.slug,
        parentId:         c.parent_id,
        image:            c.image,
        template:         c.template,           // raw stored value (may be null)
        effectiveTemplate,                      // resolved (never null)
        productCount,
        createdAt: new Date(c.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    return NextResponse.json({ categories: list });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, slug, parent_id, image, template } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const VALID_TEMPLATES = ["standard","fashion","footwear","accessories","fabric","electronics","sports","jewelry","home_living","consumables","automotive","toys","video_games","musical","books_media"];
    const finalSlug = slug?.trim()
      || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // null template means "inherit from parent"; for top-level categories default to "standard"
    const resolvedTemplate = template === null || template === ""
      ? (parent_id ? null : "standard")
      : (VALID_TEMPLATES.includes(template) ? template : null);

    const { data, error } = await ctx.admin
      .from("categories")
      .insert({
        name:      name.trim(),
        slug:      finalSlug,
        parent_id: parent_id || null,
        image:     image?.trim() || null,
        template:  resolvedTemplate,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
