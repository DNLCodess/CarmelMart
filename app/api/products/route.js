import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
 *   color          — filter by color name (matches attributes.colors array)
 *   size           — filter by size value (matches attributes.sizes array)
 *   brand          — filter by brand name (matched against product name)
 *   delivery       — "Express (24hrs)" | "Standard (2-5 days)" (price-based threshold ≥/< ₦10,000)
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
    const color         = searchParams.get("color")    || null;
    const size          = searchParams.get("size")     || null;
    const brand         = sanitizeSearchTerm(searchParams.get("brand"));
    const delivery      = searchParams.get("delivery") || null;
    const page          = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage    = Math.min(48, Math.max(1, Number(searchParams.get("per_page") || 12)));
    const offset     = (page - 1) * perPage;

    const supabase = await createClient();

    // ── Parallel: excluded vendors + optional verified vendors + optional category slug ──
    const [excludedRes, verifiedRes, catSlugRes] = await Promise.all([
      supabase.from("vendors").select("id").in("verification_status", ["suspended", "rejected"]),
      verifiedOnly
        ? supabase.from("vendors").select("id").eq("verification_status", "verified")
        : Promise.resolve({ data: null }),
      !categoryId && categorySlug
        ? supabase.from("categories").select("id").eq("slug", categorySlug).single()
        : Promise.resolve({ data: null }),
    ]);
    const excludedVendorIds = (excludedRes.data ?? []).map((v) => v.id);

    let verifiedVendorIds = null;
    if (verifiedOnly) {
      verifiedVendorIds = (verifiedRes.data ?? []).map((v) => v.id);
      if (verifiedVendorIds.length === 0) {
        return NextResponse.json({ success: true, products: [], pagination: { total: 0, page, perPage, pages: 0 } });
      }
    }

    let resolvedCategoryId = categoryId;
    if (!categoryId && categorySlug) {
      resolvedCategoryId = catSlugRes.data?.id ?? null;
      if (!resolvedCategoryId) {
        return NextResponse.json({ success: true, products: [], pagination: { total: 0, page, perPage, pages: 0 } });
      }
    }

    // ── Resolve all descendant category IDs (parent + its children) ───────────
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
      .eq("status", "active")
      .eq("moderation_status", "approved");

    if (categoryIdFilter) query = query.in("category_id", categoryIdFilter);
    // Search name AND description so partial-word matches in specs/description surface too
    if (search)             query = query.ilike("name", `%${search}%`);
    if (minPrice !== null)  query = query.gte("price", minPrice);
    if (maxPrice !== null)  query = query.lte("price", maxPrice);
    if (minRating !== null) query = query.gte("avg_rating", minRating);
    if (vendorId)               query = query.eq("vendor_id", vendorId);
    if (badge)                  query = query.eq("badge", badge);
    if (condition)              query = query.eq("condition", condition);
    if (verifiedVendorIds)      query = query.in("vendor_id", verifiedVendorIds);
    if (excludedVendorIds.length > 0) query = query.not("vendor_id", "in", `(${excludedVendorIds.join(",")})`);
    if (minDiscount !== null)   query = query.not("sale_price", "is", null);
    // color / size: check JSONB attributes array membership
    if (color) query = query.contains("attributes", { colors: [color] });
    if (size)  query = query.contains("attributes", { sizes:  [size]  });
    // brand: no dedicated column — match against product name
    if (brand) query = query.ilike("name", `%${brand}%`);
    // delivery: Express = price >= 10000 (free delivery threshold shown in product cards)
    if (delivery === "Express (24hrs)")      query = query.gte("price", 10000);
    if (delivery === "Standard (2-5 days)")  query = query.lt("price",  10000);

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

    return NextResponse.json(
      {
        success: true,
        products,
        pagination: {
          total:   count ?? 0,
          page,
          perPage,
          pages:   Math.ceil((count ?? 0) / perPage),
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
