import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderCancelledCustomer, sendVendorOrderCancelled } from "@/lib/email";

// POST /api/customer/orders/[id]/cancel
// Customer cancels an order (only allowed before shipment).
// If the customer had already paid (card or POD deposit), the amount is credited
// instantly to their CarmelMart wallet.
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { reason } = await request.json().catch(() => ({}));

    const admin = createAdminClient();

    // Fetch all fields needed for refund calculation
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, payment_status, payment_method, customer_id, total, pod_deposit, delivery_address")
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

    // ── Determine refund amount ───────────────────────────────────────────────
    // Refund goes to the customer's CarmelMart wallet (instant; no Flutterwave roundtrip).
    //
    //   payment_status = "paid"    → customer paid full order total (card)
    //   payment_method = "pod"     → payment_status is always "pending" for POD orders;
    //                                check pod_deposit + delivery_fee for what was paid upfront
    let refundAmount = 0;

    if (order.payment_status === "paid") {
      // Card-paid order: refund the full order total
      refundAmount = order.total;
    } else if (order.payment_method === "pod") {
      // POD orders: payment_status stays "pending" regardless of whether a deposit was
      // collected ("deposit_paid" is not a valid DB status — see order creation route).
      // Refund whatever was actually paid: deposit (if any) + delivery fee (if any).
      const deliveryFee = order.delivery_address?.delivery_fee ?? 0;
      refundAmount = (order.pod_deposit ?? 0) + deliveryFee;
    }
    // refundAmount = 0 for any other case (nothing was paid)

    const now = new Date().toISOString();
    const shortId = `#CM-${id.slice(0, 8).toUpperCase()}`;

    // ── Cancel order ──────────────────────────────────────────────────────────
    // The .in("status", cancellableStatuses) guard is intentional: if two concurrent
    // requests both pass the status check above, only one UPDATE will match a row
    // (the second finds status already "cancelled"). The winner gets a non-empty
    // result; the loser exits cleanly. This prevents double stock restoration.
    const { data: cancelledRows, error: updateErr } = await admin
      .from("orders")
      .update({
        status:     "cancelled",
        notes:      reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer",
        updated_at: now,
      })
      .eq("id", id)
      .in("status", cancellableStatuses)
      .select("id");

    if (updateErr) throw updateErr;
    if (!cancelledRows?.length) {
      return NextResponse.json(
        { error: "Order cannot be cancelled at this stage." },
        { status: 409 }
      );
    }

    // ── Wallet refund ─────────────────────────────────────────────────────────
    if (refundAmount > 0) {
      const { error: walletErr } = await admin.rpc("increment_wallet", {
        p_user_id: order.customer_id,
        p_amount:  refundAmount,
      });

      if (walletErr) {
        // Log for admin to manually credit — order is cancelled but payment_status
        // stays "paid"/"deposit_paid" so it's clear a refund is still owed.
        console.error(`[cancel] wallet credit failed for order ${id}:`, walletErr.message);
      } else {
        // Mark refunded only after the credit actually lands
        await admin
          .from("orders")
          .update({ payment_status: "refunded", updated_at: now })
          .eq("id", id);

        await admin.from("wallet_transactions").insert({
          user_id:     order.customer_id,
          type:        "credit",
          amount:      refundAmount,
          description: `Refund for cancelled order ${shortId}`,
          reference:   id,
          created_at:  now,
        });
      }
    }

    // ── Restore physical product stock ────────────────────────────────────────
    const { data: orderItems } = await admin
      .from("order_items")
      .select("product_id, quantity, vendor_id, delivery_format")
      .eq("order_id", id);

    for (const item of (orderItems ?? [])) {
      // Only physical items consume stock
      if (item.delivery_format === "digital") continue;
      await admin.rpc("restore_product_stock", {
        p_product_id: item.product_id,
        p_quantity:   item.quantity,
      });
    }

    // ── Notify vendors ────────────────────────────────────────────────────────
    const vendorIds = [...new Set((orderItems ?? []).map((i) => i.vendor_id).filter(Boolean))];
    if (vendorIds.length > 0) {
      const { data: vendorUsers } = await admin
        .from("users").select("id, email").in("id", vendorIds);
      for (const v of (vendorUsers ?? [])) {
        if (v.email) sendVendorOrderCancelled({ to: v.email, order: { id }, reason });
      }
    }

    // ── Notify customer ───────────────────────────────────────────────────────
    sendOrderCancelledCustomer({ to: user.email, order: { id }, reason, refundAmount });

    return NextResponse.json({ success: true, refund_amount: refundAmount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
