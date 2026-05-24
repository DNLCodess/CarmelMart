import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select(`*, categories ( id, name, slug, template )`)
      .eq("id", id)
      .eq("status", "active")
      .eq("moderation_status", "approved")
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

    // Block products from suspended or rejected vendors
    if (vendorData && ["suspended", "rejected"].includes(vendorData.verification_status)) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const product = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      salePrice: data.sale_price,
      digitalPrice: data.digital_price ?? null,
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
      // Books & Media metadata — null for non-media products
      mediaAuthor:      data.media_author ?? null,
      mediaIsbn:        data.media_isbn ?? null,
      mediaPublisher:   data.media_publisher ?? null,
      mediaPublishDate: data.media_publish_date ?? null,
      mediaEdition:     data.media_edition ?? null,
      mediaPages:       data.media_pages ?? null,
      mediaLanguage:    data.media_language ?? null,
      mediaFormat:      data.media_format ?? null,
      mediaGenre:       data.media_genre ?? [],
      isDigital:        data.is_digital ?? false,
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
