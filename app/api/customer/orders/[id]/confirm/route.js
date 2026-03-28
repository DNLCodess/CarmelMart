import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptConfirmed, sendVendorOrderDelivered } from "@/lib/email";

// POST /api/customer/orders/[id]/confirm
// Customer confirms they received the order — sets status to "delivered"
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    // Verify order belongs to customer and is in a confirmable state
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, customer_id, total, delivery_address")
      .eq("id", id)
      .eq("customer_id", user.id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const confirmableStatuses = ["pending", "confirmed", "processing", "shipped"];
    if (!confirmableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot confirm an order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Update order to delivered
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // ── Fire-and-forget email notifications ───────────────────────────────────

    // Customer receipt confirmation
    sendReceiptConfirmed({ to: user.email, order: { id } });

    // Notify all vendors whose items are in this order
    const { data: vendorItems } = await admin
      .from("order_items")
      .select("vendor_id")
      .eq("order_id", id);

    const vendorIds = [...new Set((vendorItems ?? []).map((i) => i.vendor_id).filter(Boolean))];
    if (vendorIds.length > 0) {
      const { data: vendorUsers } = await admin
        .from("users").select("id, email").in("id", vendorIds);
      for (const v of (vendorUsers ?? [])) {
        if (v.email) sendVendorOrderDelivered({ to: v.email, order: { id } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
