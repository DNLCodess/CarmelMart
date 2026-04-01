import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .select(`*, categories ( id, name, slug )`)
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: vendorData }, { count: soldToday }] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, business_name, verification_status")
        .eq("id", data.vendor_id)
        .single(),
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id)
        .gte("created_at", since24h),
    ]);

    const product = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      salePrice: data.sale_price,
      stock: data.stock,
      image: Array.isArray(data.images) ? data.images[0] : null,
      images: Array.isArray(data.images) ? data.images : [],
      attributes: data.attributes ?? {},
      condition: data.condition ?? "new",
      soldToday: soldToday ?? 0,
      avgRating: Number(data.avg_rating),
      reviewCount: data.review_count,
      soldCount: data.sold_count,
      location: data.location,
      badge: data.badge,
      createdAt: data.created_at,
      category: data.categories ?? null,
      vendor: vendorData
        ? {
            id: vendorData.id,
            name: vendorData.business_name,
            slug: vendorData.business_name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
            verified: vendorData.verification_status === "verified",
          }
        : null,
    };

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
