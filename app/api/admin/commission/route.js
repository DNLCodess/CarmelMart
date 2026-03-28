import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return { user, admin };
}

export async function GET() {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [
      { data: vendorRates },
      { data: catRates },
      { data: feeRow },
      { data: allVendors },
      { data: allCategories },
    ] = await Promise.all([
      ctx.admin.from("commission_rates").select("id, rate, target_id, note, updated_at").eq("type", "vendor"),
      ctx.admin.from("commission_rates").select("id, rate, target_id, note, updated_at").eq("type", "category"),
      ctx.admin.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
      ctx.admin.from("vendors").select("id, business_name"),
      ctx.admin.from("categories").select("id, name").order("name"),
    ]);

    // Bulk-fetch vendor owner emails (vendors.id === users.id)
    const vendorIds = (allVendors || []).map((v) => v.id);
    let vendorUserMap = {};
    if (vendorIds.length > 0) {
      const { data: vendorUsers } = await ctx.admin
        .from("users").select("id, email").in("id", vendorIds);
      vendorUserMap = Object.fromEntries((vendorUsers ?? []).map((u) => [u.id, u]));
    }

    // Enrich vendor rates with vendor details
    const vendorMap = Object.fromEntries((allVendors || []).map((v) => [v.id, v]));
    const vendorOverrides = (vendorRates || []).map((r) => {
      const v = vendorMap[r.target_id];
      return {
        id:           r.id,
        rate:         r.rate,
        vendorId:     r.target_id,
        businessName: v?.business_name ?? "Unknown vendor",
        ownerName:    vendorUserMap[r.target_id]?.email ?? "",
        note:         r.note,
        updatedAt:    r.updated_at,
      };
    });

    // Enrich category rates with category details
    const catMap = Object.fromEntries((allCategories || []).map((c) => [c.id, c]));
    const categoryOverrides = (catRates || []).map((r) => ({
      id:         r.id,
      rate:       r.rate,
      categoryId: r.target_id,
      name:       catMap[r.target_id]?.name ?? "Unknown category",
      note:       r.note,
      updatedAt:  r.updated_at,
    }));

    // Vendors/categories that already have overrides (for UI filtering)
    const vendorOverrideIds   = new Set(vendorOverrides.map((r) => r.vendorId));
    const categoryOverrideIds = new Set(categoryOverrides.map((r) => r.categoryId));

    return NextResponse.json({
      defaultRate:       Number(feeRow?.value ?? 10),
      vendorOverrides,
      categoryOverrides,
      // Available (not yet overridden) lists for add modal
      availableVendors:     (allVendors || []).filter((v) => !vendorOverrideIds.has(v.id)).map((v) => ({
        id:           v.id,
        businessName: v.business_name,
        ownerName:    vendorUserMap[v.id]?.email ?? "",
      })),
      availableCategories:  (allCategories || []).filter((c) => !categoryOverrideIds.has(c.id)).map((c) => ({
        id:   c.id,
        name: c.name,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create or update an override (upserts on type+target_id)
export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type, target_id, rate, note } = await request.json();

    if (!["vendor", "category"].includes(type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!target_id)
      return NextResponse.json({ error: "target_id required" }, { status: 400 });
    const rateNum = Number(rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100)
      return NextResponse.json({ error: "Rate must be 0–100" }, { status: 400 });

    const { error } = await ctx.admin
      .from("commission_rates")
      .upsert(
        {
          type,
          target_id,
          rate:       rateNum,
          note:       note?.trim() || null,
          created_by: ctx.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "type,target_id" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
