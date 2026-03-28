import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories ( id, name, slug ),
        users!vendor_id (
          id,
          vendors ( business_name, verification_status, cac_number )
        )
      `)
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const product = {
      id:          data.id,
      name:        data.name,
      slug:        data.slug,
      description: data.description,
      price:       data.price,
      salePrice:   data.sale_price,
      stock:       data.stock,
      image:       Array.isArray(data.images) ? data.images[0] : null,
      images:      Array.isArray(data.images) ? data.images : [],
      attributes:  data.attributes,
      avgRating:   Number(data.avg_rating),
      reviewCount: data.review_count,
      soldCount:   data.sold_count,
      location:    data.location,
      badge:       data.badge,
      createdAt:   data.created_at,
      category:    data.categories ?? null,
      vendor:      data.users?.vendors ? {
        id:       data.users.id,
        name:     data.users.vendors.business_name,
        slug:     data.users.vendors.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        verified: data.users.vendors.verification_status === "verified",
      } : null,
    };

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
