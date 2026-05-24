import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  return p?.role === "admin" ? { user, admin } : null;
}

// GET — list VIP vendors with enriched data for the management panel
export async function GET() {
  try {
    const ctx = await verifyAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { admin } = ctx;

    const { data: vendors, error } = await admin
      .from("vendors")
      .select("id, business_name, verification_status, city, state, description, created_at")
      .eq("subscription_tier", "vip")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ids = (vendors ?? []).map((v) => v.id);
    let userMap = {}, subMap = {}, noteMap = {};

    if (ids.length > 0) {
      const noteKeys = ids.map((id) => `vip_note_${id}`);
      const [{ data: users }, { data: subs }, { data: notes }] = await Promise.all([
        admin.from("users").select("id, email, phone").in("id", ids),
        admin.from("vendor_subscriptions").select("vendor_id, billing_cycle, expires_at, started_at").eq("status", "active").eq("tier", "vip").in("vendor_id", ids),
        admin.from("platform_settings").select("key, value").in("key", noteKeys),
      ]);
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
      subMap  = Object.fromEntries((subs  ?? []).map((s) => [s.vendor_id, s]));
      noteMap = Object.fromEntries((notes ?? []).map((n) => [n.key.replace("vip_note_", ""), n.value]));
    }

    const result = (vendors ?? []).map((v) => ({
      id:                 v.id,
      business_name:      v.business_name,
      verification_status:v.verification_status,
      city:               v.city,
      state:              v.state,
      created_at:         v.created_at,
      email:              userMap[v.id]?.email ?? null,
      phone:              userMap[v.id]?.phone ?? null,
      subscription:       subMap[v.id]  ?? null,
      account_note:       noteMap[v.id] ?? "",
    }));

    return NextResponse.json({ vendors: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — save account manager note for a VIP vendor
export async function PATCH(request) {
  try {
    const ctx = await verifyAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { user, admin } = ctx;

    const { vendor_id, note } = await request.json();
    if (!vendor_id) return NextResponse.json({ error: "vendor_id required" }, { status: 400 });

    // Confirm vendor is actually VIP
    const { data: vendor } = await admin
      .from("vendors")
      .select("subscription_tier")
      .eq("id", vendor_id)
      .single();
    if (!vendor || vendor.subscription_tier !== "vip") {
      return NextResponse.json({ error: "Vendor is not on VIP tier" }, { status: 400 });
    }

    await admin.from("platform_settings").upsert(
      {
        key:        `vip_note_${vendor_id}`,
        value:      (note ?? "").trim(),
        description:`Account manager note for VIP vendor ${vendor_id}`,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "key" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
