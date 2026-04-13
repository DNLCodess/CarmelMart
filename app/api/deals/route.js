import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Revalidate every 10 minutes — deals don't change second-by-second
export const revalidate = 600;

/**
 * GET /api/deals
 * Returns active products that have a sale_price set,
 * ordered by highest discount percentage (computed in JS).
 * Limit: 8 products.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Exclude products from suspended or rejected vendors
    const { data: excludedVendors } = await supabase
      .from("vendors")
      .select("id")
      .in("verification_status", ["suspended", "rejected"]);
    const excludedVendorIds = (excludedVendors ?? []).map((v) => v.id);

    let dealsQuery = supabase
      .from("products")
      .select(`
        id, name, slug, price, sale_price, stock,
        vendor_id, images, avg_rating, review_count, sold_count,
        condition, attributes, badge,
        categories ( id, name, slug )
      `)
      .eq("status", "active")
      .not("sale_price", "is", null)
      .gt("sale_price", 0)
      .limit(40); // fetch more, sort by discount in JS, slice to 8

    if (excludedVendorIds.length > 0) {
      dealsQuery = dealsQuery.not("vendor_id", "in", `(${excludedVendorIds.join(",")})`);
    }

    const { data, error } = await dealsQuery;

    if (error) throw error;

    const products = (data ?? [])
      .map((p) => ({
        id:          p.id,
        name:        p.name,
        slug:        p.slug,
        price:       p.price,
        salePrice:   p.sale_price,
        discount:    Math.round(((p.price - p.sale_price) / p.price) * 100),
        stock:       p.stock,
        image:       Array.isArray(p.images) ? p.images[0] : null,
        avgRating:   Number(p.avg_rating ?? 0),
        reviewCount: p.review_count ?? 0,
        soldCount:   p.sold_count   ?? 0,
        condition:   p.condition    ?? "new",
        attributes:  p.attributes   ?? {},
        badge:       p.badge,
        category:    p.categories
          ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
          : null,
      }))
      .filter((p) => p.discount >= 5) // only meaningful discounts
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 8);

    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json({ success: false, products: [], error: error.message });
  }
}
