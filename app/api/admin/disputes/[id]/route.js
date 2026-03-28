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

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { action, resolution } = await request.json();

    let newStatus;
    if (action === "side_customer") newStatus = "resolved_customer";
    else if (action === "side_vendor") newStatus = "resolved_vendor";
    else if (action === "close")       newStatus = "closed";
    else if (action === "review")      newStatus = "under_review";
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const update = {
      status:      newStatus,
      updated_at:  new Date().toISOString(),
      resolved_by: ctx.user.id,
    };
    if (resolution !== undefined) update.resolution = resolution ?? null;

    const { error } = await ctx.admin
      .from("disputes")
      .update(update)
      .eq("id", id);

    if (error) throw error;

    // If siding with customer, optionally update order status to refunded
    if (action === "side_customer") {
      const { data: dispute } = await ctx.admin
        .from("disputes")
        .select("order_id")
        .eq("id", id)
        .single();
      if (dispute?.order_id) {
        await ctx.admin
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", dispute.order_id);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
