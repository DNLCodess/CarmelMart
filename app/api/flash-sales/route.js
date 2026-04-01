import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60; // revalidate every 60 seconds

export async function GET() {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Find the currently live flash sale (active, within time window)
    const { data: sale, error: saleErr } = await admin
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

    // Fetch products in this flash sale with full product details
    const { data: saleProducts, error: prodErr } = await admin
      .from("flash_sale_products")
      .select(`
        sale_price,
        products (
          id, name, images, price,
          avg_rating, review_count, stock, sold_count,
          vendors ( id, business_name, verified )
        )
      `)
      .eq("flash_sale_id", sale.id)
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

    return NextResponse.json({
      sale: {
        id:            sale.id,
        title:         sale.title,
        description:   sale.description,
        discountType:  sale.discount_type,
        discountValue: sale.discount_value,
        endsAt:        sale.ends_at,
      },
      products,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
