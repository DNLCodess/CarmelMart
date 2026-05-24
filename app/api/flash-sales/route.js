import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60; // revalidate every 60 seconds

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Find the currently live flash sale (active, within time window)
    const { data: sale, error: saleErr } = await supabase
      .from("flash_sales")
      .select("id, title, description, discount_type, discount_value, ends_at")
      .eq("active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (saleErr) throw saleErr;
    if (!sale) return NextResponse.json({ sale: null, products: [] });

    // Fetch products in this flash sale — inner join so unapproved/inactive products are excluded
    const { data: saleProducts, error: prodErr } = await supabase
      .from("flash_sale_products")
      .select(`
        sale_price,
        products!inner (
          id, name, images, price,
          avg_rating, review_count, stock, sold_count,
          vendors ( id, business_name )
        )
      `)
      .eq("flash_sale_id", sale.id)
      .eq("products.status", "active")
      .eq("products.moderation_status", "approved")
      .limit(8);

    if (prodErr) throw prodErr;

    const products = (saleProducts || [])
      .filter((sp) => sp.products)
      .map((sp) => {
        const p = sp.products;
        return {
          id:         p.id,
          name:       p.name,
          price:      p.price,
          salePrice:  sp.sale_price,
          image:      Array.isArray(p.images) ? p.images[0] : p.images,
          vendor:     p.vendors?.business_name ?? "CarmelMart Seller",
          verified:   p.vendors?.verified ?? false,
          rating:     p.avg_rating ?? 0,
          reviews:    p.review_count ?? 0,
          stock:      p.stock ?? 0,
          sold:       p.sold_count ?? 0,
        };
      });

    return NextResponse.json(
      {
        sale: {
          id:            sale.id,
          title:         sale.title,
          description:   sale.description,
          discountType:  sale.discount_type,
          discountValue: sale.discount_value,
          endsAt:        sale.ends_at,
        },
        products,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
