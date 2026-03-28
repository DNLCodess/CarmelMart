import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderCancelledCustomer, sendVendorOrderCancelled } from "@/lib/email";

// POST /api/customer/orders/[id]/cancel
// Customer cancels an order (only allowed while pending or processing)
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { reason } = await request.json().catch(() => ({}));

    const admin = createAdminClient();

    // Verify order belongs to customer
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, customer_id, total, delivery_address")
      .eq("id", id)
      .eq("customer_id", user.id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow cancellation before shipment
    const cancellableStatuses = ["pending", "confirmed", "processing"];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "Order cannot be cancelled after it has been shipped. Please raise a dispute instead." },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "cancelled", notes: reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer" })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // Restore product stock + collect vendor IDs for notifications
    const { data: orderItems } = await admin
      .from("order_items")
      .select("product_id, quantity, vendor_id")
      .eq("order_id", id);

    for (const item of (orderItems ?? [])) {
      const { data: prod } = await admin
        .from("products").select("stock").eq("id", item.product_id).single();
      if (prod) {
        await admin
          .from("products")
          .update({ stock: prod.stock + item.quantity })
          .eq("id", item.product_id);
      }
    }

    // Notify all unique vendors
    const vendorIds = [...new Set((orderItems ?? []).map((i) => i.vendor_id).filter(Boolean))];
    if (vendorIds.length > 0) {
      const { data: vendorUsers } = await admin
        .from("users").select("id, email").in("id", vendorIds);
      for (const v of (vendorUsers ?? [])) {
        if (v.email) sendVendorOrderCancelled({ to: v.email, order: { id }, reason });
      }
    }

    // Notify customer
    sendOrderCancelledCustomer({ to: user.email, order: { id }, reason });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
