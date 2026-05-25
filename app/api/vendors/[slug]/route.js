import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const admin = createAdminClient();

    const { data: vendor, error } = await admin
      .from("vendors")
      .select("id, business_name, verification_status, subscription_tier, created_at")
      .eq("slug", slug)
      .eq("verification_status", "verified")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Fetch user join date from public.users
    const { data: userRow } = await admin
      .from("users").select("created_at").eq("id", vendor.id).single();

    // Fetch vendor's active products
    const { data: products } = await admin
      .from("products")
      .select("id, name, price, sale_price, images, avg_rating, review_count, stock")
      .eq("vendor_id", vendor.id)
      .eq("status", "active")
      .order("sold_count", { ascending: false })
      .limit(50);

    // Count total products & orders
    const { count: productCount } = await admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", vendor.id)
      .eq("status", "active");

    const { count: orderCount } = await admin
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", vendor.id);

    const firstImage = (products ?? [])[0]?.images?.[0] ?? null;

    return NextResponse.json({
      vendor: {
        id:            vendor.id,
        name:          vendor.business_name,
        slug,
        verified:      true,
        tier:          vendor.subscription_tier ?? "free",
        memberSince:   userRow?.created_at ?? vendor.created_at ?? null,
        productCount:  productCount ?? 0,
        orderCount:    orderCount   ?? 0,
        image:         firstImage,
      },
      products: (products ?? []).map((p) => ({
        id:          p.id,
        name:        p.name,
        price:       p.price,
        sale_price:  p.sale_price,
        image:       Array.isArray(p.images) ? p.images[0] : null,
        avg_rating:  p.avg_rating,
        review_count: p.review_count,
        in_stock:    p.stock > 0,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
