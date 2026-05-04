import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const modStatus     = searchParams.get("moderation_status") || null;
    const featuredOnly  = searchParams.get("featured") === "true";
    const search        = searchParams.get("search") || null;
    const categoryId    = searchParams.get("category_id") || null;
    const page          = Math.max(1, Number(searchParams.get("page") || 1));
    const limit         = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

    let query = admin
      .from("products")
      .select(`
        id, name, price, sale_price, stock, status, moderation_status, moderation_reason, featured,
        images, created_at, vendor_id,
        categories ( name )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (featuredOnly)   query = query.eq("featured", true);
    else if (modStatus) query = query.eq("moderation_status", modStatus);
    if (search)         query = query.ilike("name", `%${search}%`);
    if (categoryId)     query = query.eq("category_id", categoryId);

    const { data, error: qErr, count } = await query;
    if (qErr) throw qErr;

    // Bulk-fetch vendor names (products.vendor_id === vendors.id === users.id)
    const vIds = [...new Set((data ?? []).map((p) => p.vendor_id).filter(Boolean))];
    let vendorNameMap = {};
    if (vIds.length > 0) {
      const { data: vRows } = await admin.from("vendors").select("id, business_name").in("id", vIds);
      vendorNameMap = Object.fromEntries((vRows ?? []).map((v) => [v.id, v.business_name]));
    }

    const products = (data || []).map((p) => ({
      id:                p.id,
      name:              p.name,
      price:             p.price,
      salePrice:         p.sale_price,
      stock:             p.stock,
      status:            p.status,
      moderationStatus:  p.moderation_status,
      moderationReason:  p.moderation_reason,
      image:             Array.isArray(p.images) ? p.images[0] : null,
      category:          p.categories?.name ?? "—",
      vendorName:        vendorNameMap[p.vendor_id] ?? "—",
      vendorId:          p.vendor_id ?? null,
      featured:          p.featured ?? false,
      createdAt:         new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    }));

    return NextResponse.json({
      products,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
      page,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
