import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/products
 * Query params:
 *   category   — category slug
 *   category_id — category UUID (takes precedence over slug)
 *   search     — text search
 *   min_price  — minimum price (NGN)
 *   max_price  — maximum price (NGN)
 *   min_rating — minimum avg_rating (0–5)
 *   sort       — newest | price_asc | price_desc | rating | popular
 *   page       — page number (1-based, default 1)
 *   per_page   — results per page (default 12, max 48)
 *   vendor_id  — filter to a specific vendor
 *   badge      — filter by badge text
 *   featured   — "true" to return only featured products
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const categorySlug = searchParams.get("category")    || null;
    const categoryId   = searchParams.get("category_id") || null;
    const search     = searchParams.get("search")    || null;
    const minPrice   = searchParams.get("min_price") ? Number(searchParams.get("min_price")) : null;
    const maxPrice   = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : null;
    const minRating  = searchParams.get("min_rating") ? Number(searchParams.get("min_rating")) : null;
    const sort       = searchParams.get("sort")      || "newest";
    const vendorId   = searchParams.get("vendor_id") || null;
    const badge      = searchParams.get("badge")     || null;
    const featured   = searchParams.get("featured")  === "true";
    const page       = Math.max(1, Number(searchParams.get("page")     || 1));
    const perPage    = Math.min(48, Math.max(1, Number(searchParams.get("per_page") || 12)));
    const offset     = (page - 1) * perPage;

    const supabase = createAdminClient();

    // ── Resolve category slug → id ────────────────────────────────────────────
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();
      resolvedCategoryId = cat?.id ?? null;
      // If no category found for the given slug, return empty
      if (!resolvedCategoryId) {
        return NextResponse.json({ success: true, products: [], pagination: { total: 0, page, perPage, pages: 0 } });
      }
    }

    // ── Products query — no nested vendor join, simpler and reliable ──────────
    let query = supabase
      .from("products")
      .select(`
        id, name, slug, description, price, sale_price, stock,
        vendor_id, images, avg_rating, review_count, sold_count,
        location, badge, status, created_at,
        categories ( id, name, slug )
      `, { count: "exact" })
      .eq("status", "active");

    if (resolvedCategoryId) query = query.eq("category_id", resolvedCategoryId);
    if (search)             query = query.ilike("name", `%${search}%`);
    if (minPrice !== null)  query = query.gte("price", minPrice);
    if (maxPrice !== null)  query = query.lte("price", maxPrice);
    if (minRating !== null) query = query.gte("avg_rating", minRating);
    if (vendorId)           query = query.eq("vendor_id", vendorId);
    if (badge)              query = query.eq("badge", badge);

    // featured column may not exist in older DB instances — try it, fall back gracefully
    if (featured) {
      try { query = query.eq("featured", true); } catch { /* column may not exist */ }
    }

    switch (sort) {
      case "price_asc":  query = query.order("price",      { ascending: true });  break;
      case "price_desc": query = query.order("price",      { ascending: false }); break;
      case "rating":     query = query.order("avg_rating", { ascending: false }); break;
      case "popular":    query = query.order("sold_count", { ascending: false }); break;
      default:           query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // ── Bulk-fetch vendor names for returned products ─────────────────────────
    const vendorIds = [...new Set((data ?? []).map((p) => p.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, business_name, verification_status")
        .in("id", vendorIds);
      vendorMap = Object.fromEntries((vendors ?? []).map((v) => [v.id, v]));
    }

    // ── Normalise ─────────────────────────────────────────────────────────────
    const products = (data ?? []).map((p) => {
      const vendor = vendorMap[p.vendor_id] ?? null;
      return {
        id:          p.id,
        name:        p.name,
        slug:        p.slug,
        description: p.description,
        price:       p.price,
        salePrice:   p.sale_price,
        stock:       p.stock,
        image:       Array.isArray(p.images) ? p.images[0] : null,
        images:      Array.isArray(p.images) ? p.images : [],
        avgRating:   Number(p.avg_rating ?? 0),
        reviewCount: p.review_count ?? 0,
        soldCount:   p.sold_count   ?? 0,
        location:    p.location,
        badge:       p.badge,
        createdAt:   p.created_at,
        category:    p.categories
          ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
          : null,
        vendor: vendor
          ? { id: vendor.id, name: vendor.business_name, verified: vendor.verification_status === "verified" }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        total:   count ?? 0,
        page,
        perPage,
        pages:   Math.ceil((count ?? 0) / perPage),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
