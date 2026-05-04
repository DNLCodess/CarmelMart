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

export async function PATCH(request, { params }) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { name, slug, parent_id, image } = await request.json();

    const update = {};
    if (name !== undefined)      update.name      = name.trim();
    if (slug !== undefined)      update.slug      = slug.trim();
    if (parent_id !== undefined) update.parent_id = parent_id || null;
    if (image !== undefined)     update.image     = image?.trim() || null;

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { error } = await ctx.admin.from("categories").update(update).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const { count } = await ctx.admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (count > 0 && !force)
      return NextResponse.json(
        { error: `Cannot delete — ${count} product(s) use this category`, productCount: count },
        { status: 409 },
      );

    if (force && count > 0) {
      const { error: delProductsErr } = await ctx.admin
        .from("products")
        .delete()
        .eq("category_id", id);
      if (delProductsErr) throw delProductsErr;
    }

    const { error } = await ctx.admin.from("categories").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, deletedProducts: force ? (count ?? 0) : 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
