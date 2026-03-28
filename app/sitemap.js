import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carmelmart.com";

export default async function sitemap() {
  const now = new Date().toISOString();

  const staticRoutes = [
    { url: BASE_URL,                         lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/shop`,               lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/search`,             lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
    { url: `${BASE_URL}/register`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/login`,              lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/help`,               lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
  ];

  try {
    const admin = createAdminClient();

    // Products
    const { data: products } = await admin
      .from("products")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5000);

    const productRoutes = (products ?? []).map((p) => ({
      url:             `${BASE_URL}/product/${p.id}`,
      lastModified:    p.updated_at ?? now,
      changeFrequency: "weekly",
      priority:        0.8,
    }));

    // Categories
    const { data: categories } = await admin
      .from("categories")
      .select("slug, updated_at");

    const categoryRoutes = (categories ?? []).map((c) => ({
      url:             `${BASE_URL}/category/${c.slug}`,
      lastModified:    c.updated_at ?? now,
      changeFrequency: "daily",
      priority:        0.7,
    }));

    // Vendors (verified only)
    const { data: vendors } = await admin
      .from("vendors")
      .select("business_name, updated_at")
      .eq("verification_status", "verified");

    const vendorRoutes = (vendors ?? []).map((v) => ({
      url:             `${BASE_URL}/vendor/${v.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      lastModified:    v.updated_at ?? now,
      changeFrequency: "weekly",
      priority:        0.6,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...vendorRoutes];
  } catch {
    // Fall back to static-only if DB is unavailable
    return staticRoutes;
  }
}
