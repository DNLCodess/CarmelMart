import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getVendor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "vendor") return null;
  return { user, admin };
}

export async function GET() {
  try {
    const ctx = await getVendor();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: zones } = await ctx.admin
      .from("vendor_shipping_zones")
      .select("id, state, fee, free_above, active")
      .eq("vendor_id", ctx.user.id)
      .order("state", { ascending: true });

    return NextResponse.json({ zones: zones ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getVendor();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { state, fee, free_above } = await request.json();
    if (!state?.trim()) return NextResponse.json({ error: "State is required" }, { status: 400 });

    const { data, error } = await ctx.admin
      .from("vendor_shipping_zones")
      .upsert({
        vendor_id:  ctx.user.id,
        state:      state.trim(),
        fee:        Number(fee)        || 0,
        free_above: free_above != null ? Number(free_above) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "vendor_id,state" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ zone: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const ctx = await getVendor();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await ctx.admin
      .from("vendor_shipping_zones")
      .delete()
      .eq("id", id)
      .eq("vendor_id", ctx.user.id); // ensures vendor can only delete their own

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
