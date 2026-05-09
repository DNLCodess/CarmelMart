import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProductLimit } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: products, error } = await admin
      .from("products")
      .select("*, moderation_status, moderation_reason, categories(id, name, slug)")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalized = (products || []).map((p) => ({
      id:                p.id,
      name:              p.name,
      price:             p.price,
      sale_price:        p.sale_price,
      stock:             p.stock,
      status:            p.status,
      moderation_status: p.moderation_status ?? "pending",
      moderation_reason: p.moderation_reason ?? null,
      image:             Array.isArray(p.images) ? p.images[0] : null,
      images:            Array.isArray(p.images) ? p.images : [],
      sold_count:        p.sold_count,
      avg_rating:        p.avg_rating,
      category:          p.categories ?? null,
    }));

    return NextResponse.json({ products: normalized });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — bulk status update for multiple products
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { ids, status } = await request.json();
    if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });
    // Vendors can only set inactive/draft — "active" requires admin approval
    if (!["inactive", "draft"].includes(status))
      return NextResponse.json({ error: "Invalid status. Products can only be set to inactive or draft by vendors." }, { status: 400 });

    const { error } = await admin
      .from("products")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids)
      .eq("vendor_id", user.id); // ownership guard

    if (error) throw error;
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Enforce product limit based on subscription tier
    const { data: vendor } = await admin
      .from("vendors")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = vendor?.subscription_tier ?? "free";

    // Count all non-rejected products (pending, approved, flagged, inactive, draft all count)
    const { count: productCount } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .neq("moderation_status", "rejected");

    const limitCheck = checkProductLimit(tier, productCount ?? 0);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Product limit reached. Your ${tier} plan allows up to ${limitCheck.limit} products. Upgrade your plan to add more.`,
          code: "PRODUCT_LIMIT_REACHED",
          limit: limitCheck.limit,
          current: limitCheck.current,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, sale_price, stock, category_id, images, condition, attributes } = body;

    if (!name || !price) return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    if (sale_price && Number(sale_price) >= Number(price)) {
      return NextResponse.json({ error: "Sale price must be less than regular price" }, { status: 400 });
    }
    if (sale_price && tier === "free") {
      return NextResponse.json(
        { error: "Promotions & deals are not available on the Free plan. Upgrade to Premium or VIP to set sale prices.", code: "PROMOTIONS_GATED" },
        { status: 403 }
      );
    }
    const VALID_CONDITIONS = ["new", "used", "refurbished"];

    const { data: product, error } = await admin
      .from("products")
      .insert({
        vendor_id:         user.id,
        name:              name.trim(),
        description:       description?.trim() ?? null,
        price:             Number(price),
        sale_price:        sale_price ? Number(sale_price) : null,
        stock:             Number(stock ?? 0),
        category_id:       category_id || null,
        status:            "inactive",        // not live until admin approves
        moderation_status: "pending",
        images:            images ?? [],
        condition:         VALID_CONDITIONS.includes(condition) ? condition : "new",
        attributes:        attributes && typeof attributes === "object" ? attributes : {},
        created_at:        new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
