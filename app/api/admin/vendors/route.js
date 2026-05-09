import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET(request) {
  try {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const tier   = searchParams.get("tier")   || "all";
    const search = searchParams.get("search") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 20;

    const admin = createAdminClient();

    // Step 1: fetch vendors (no cross-schema join — vendors.id FK is to auth.users, not public.users)
    let query = admin
      .from("vendors")
      .select(
        "id, business_name, cac_number, nin_verified, cac_verified, verification_status, subscription_tier, city, state, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== "all") query = query.eq("verification_status", status);
    if (tier   !== "all") query = query.eq("subscription_tier", tier);
    if (search) query = query.ilike("business_name", `%${search}%`);

    const { data: vendorRows, error, count } = await query;
    if (error) throw error;

    // Step 2: bulk-fetch user profiles from public.users
    const ids = (vendorRows ?? []).map((v) => v.id);
    let userMap = {};
    if (ids.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, email, phone, created_at")
        .in("id", ids);
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    }

    const vendors = (vendorRows ?? []).map((v) => ({
      ...v,
      email:      userMap[v.id]?.email ?? null,
      phone:      userMap[v.id]?.phone ?? null,
      userSince:  userMap[v.id]?.created_at ?? v.created_at,
    }));

    return NextResponse.json({
      vendors,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
      page,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
