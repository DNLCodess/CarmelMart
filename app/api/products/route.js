import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function sanitizeSearchTerm(value) {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/[%_*]/g, "")
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned || null;
}

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
 *   condition      — "new" | "used" | "refurbished"
 *   verified_only  — "true" to return only products from verified vendors
 *   min_discount   — minimum discount % (integer 1–99, requires sale_price)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const categorySlug = searchParams.get("category")    || null;
    const categoryId   = searchParams.get("category_id") || null;
    const search     = sanitizeSearchTerm(searchParams.get("search"));
    const minPrice   = searchParams.get("min_price") ? Number(searchParams.get("min_price")) : null;
    const maxPrice   = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : null;
    const minRating  = searchParams.get("min_rating") ? Number(searchParams.get("min_rating")) : null;
    const sort       = searchParams.get("sort")      || "newest";
    const vendorId   = searchParams.get("vendor_id") || null;
    const badge      = searchParams.get("badge")     || null;
    const featured   = searchParams.get("featured")  === "true";
    const condition     = searchParams.get("condition")      || null;
    const verifiedOnly  = searchParams.get("verified_only") === "true";
    const minDiscount   = searchParams.get("min_discount") ? Number(searchParams.get("min_discount")) : null;
    const page          = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage    = Math.min(48, Math.max(1, Number(searchParams.get("per_page") || 12)));
    const offset     = (page - 1) * perPage;

    const supabase = createAdminClient();

    // ── Fetch suspended/rejected vendor IDs to always exclude ────────────────
    const { data: excludedVendors } = await supabase
      .from("vendors")
      .select("id")
      .in("verification_status", ["suspended", "rejected"]);
    const excludedVendorIds = (excludedVendors ?? []).map((v) => v.id);

    // ── Resolve verified vendor IDs (if filter requested) ────────────────────
    let verifiedVendorIds = null;
    if (verifiedOnly) {
      const { data: vv } = await supabase
        .from("vendors")
        .select("id")
        .eq("verification_status", "verified");
      verifiedVendorIds = (vv ?? []).map((v) => v.id);
      // If no verified vendors exist yet, return empty early
      if (verifiedVendorIds.length === 0) {
        return NextResponse.json({ success: true, products: [], pagination: { total: 0, page, perPage, pages: 0 } });
      }
    }

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

    // ── Resolve all descendant category IDs (parent + its children) ───────────
    // When a parent category is requested, include products from all sub-categories.
    let categoryIdFilter = resolvedCategoryId ? [resolvedCategoryId] : null;
    if (resolvedCategoryId) {
      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", resolvedCategoryId);
      if (children?.length) {
        categoryIdFilter = [resolvedCategoryId, ...children.map((c) => c.id)];
      }
    }

    // ── Products query — no nested vendor join, simpler and reliable ──────────
    let query = supabase
      .from("products")
      .select(`
        id, name, slug, description, price, sale_price, stock,
        vendor_id, images, avg_rating, review_count, sold_count,
        condition, attributes, location, badge, status, created_at,
        categories ( id, name, slug )
      `, { count: "exact" })
      .eq("status", "active");

    if (categoryIdFilter) query = query.in("category_id", categoryIdFilter);
    // Search name AND description so partial-word matches in specs/description surface too
    if (search)             query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (minPrice !== null)  query = query.gte("price", minPrice);
    if (maxPrice !== null)  query = query.lte("price", maxPrice);
    if (minRating !== null) query = query.gte("avg_rating", minRating);
    if (vendorId)               query = query.eq("vendor_id", vendorId);
    if (badge)                  query = query.eq("badge", badge);
    if (condition)              query = query.eq("condition", condition);
    if (verifiedVendorIds)      query = query.in("vendor_id", verifiedVendorIds);
    if (excludedVendorIds.length > 0) query = query.not("vendor_id", "in", `(${excludedVendorIds.join(",")})`);
    if (minDiscount !== null)   query = query.not("sale_price", "is", null);

    // featured column may not exist in older DB instances — try it, fall back gracefully
    if (featured) query = query.eq("featured", true);

    switch (sort) {
      case "price_asc":  query = query.order("price",      { ascending: true });  break;
      case "price_desc": query = query.order("price",      { ascending: false }); break;
      case "rating":     query = query.order("avg_rating", { ascending: false }); break;
      case "popular":    query = query.order("sold_count", { ascending: false }); break;
      case "discount":   query = query.not("sale_price", "is", null).order("price", { ascending: false }); break;
      // Relevance: highest-rated + most-sold matching products rise to top
      case "relevance":  query = query.order("avg_rating", { ascending: false }).order("sold_count", { ascending: false }); break;
      default:           query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // ── Bulk-fetch vendor info (name + tier) for returned products ───────────
    const vendorIds = [...new Set((data ?? []).map((p) => p.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, business_name, verification_status, subscription_tier")
        .in("id", vendorIds);
      vendorMap = Object.fromEntries((vendors ?? []).map((v) => [v.id, v]));
    }

    // ── Normalise ─────────────────────────────────────────────────────────────
    let products = (data ?? []).map((p) => {
      const vendor = vendorMap[p.vendor_id] ?? null;
      const discount = p.sale_price && p.price > 0
        ? Math.round(((p.price - p.sale_price) / p.price) * 100)
        : 0;
      return {
        id:          p.id,
        name:        p.name,
        slug:        p.slug,
        description: p.description,
        price:       p.price,
        salePrice:   p.sale_price,
        discount,
        stock:       p.stock,
        image:       Array.isArray(p.images) ? p.images[0] : null,
        images:      Array.isArray(p.images) ? p.images : [],
        avgRating:   Number(p.avg_rating ?? 0),
        reviewCount: p.review_count ?? 0,
        soldCount:   p.sold_count   ?? 0,
        condition:   p.condition    ?? "new",
        attributes:  p.attributes   ?? {},
        location:    p.location,
        badge:       p.badge,
        createdAt:   p.created_at,
        category:    p.categories
          ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
          : null,
        vendor: vendor
          ? { id: vendor.id, name: vendor.business_name, verified: vendor.verification_status === "verified", tier: vendor.subscription_tier ?? "free" }
          : null,
      };
    });

    // Post-filter by discount %
    if (minDiscount !== null) {
      products = products.filter((p) => p.discount >= minDiscount);
    }

    // Tier-based ranking boost for default/relevance sorts.
    // VIP > Premium > Free — stable sort preserves DB order within each tier group.
    const TIER_RANK = { vip: 0, premium: 1, free: 2 };
    if (sort === "newest" || sort === "relevance") {
      products.sort((a, b) => {
        const ra = TIER_RANK[a.vendor?.tier ?? "free"] ?? 2;
        const rb = TIER_RANK[b.vendor?.tier ?? "free"] ?? 2;
        return ra - rb;
      });
    }

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
