import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusUpdate } from "@/lib/email";
import { getCommissionRate } from "@/lib/subscription";

// Riders can only advance orders through delivery states — no skipping.
const ALLOWED_TRANSITIONS = {
  pending:    ["confirmed"],
  confirmed:  ["processing"],
  processing: ["shipped"],
  shipped:    ["delivered"],
};

async function guardRiderOrAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "rider"].includes(profile.role)) {
    return { error: "Forbidden", status: 403 };
  }
  if (profile.role === "rider" && (profile.status === "suspended" || profile.status === "banned")) {
    return { error: "Account suspended.", status: 403 };
  }
  return { user, admin, role: profile.role };
}

/**
 * PATCH /api/rider/orders/[id]/status
 * Body: { status: 'confirmed' | 'processing' | 'shipped' | 'delivered' }
 *
 * Riders: strict forward-only delivery transitions for orders assigned to them.
 * Admins: can set any valid delivery status.
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardRiderOrAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin, role } = guard;
    const { id: orderId } = await params;

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, payment_status, customer_id, total, payment_method, delivery_address, rider_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Riders can only update orders assigned to them
    if (role === "rider" && order.rider_id !== user.id) {
      return NextResponse.json({ error: "This order is not assigned to you." }, { status: 403 });
    }

    const currentStatus = order.status;

    if (role === "rider") {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot move order from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(", ")}].`,
            code:  "INVALID_TRANSITION",
          },
          { status: 400 }
        );
      }
    } else {
      // Admin: allow any delivery state except refunded (use refund endpoint for that)
      const validStates = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
      if (!validStates.includes(newStatus)) {
        return NextResponse.json({ error: `Invalid status '${newStatus}'. Use the refund endpoint for refunds.` }, { status: 400 });
      }
    }

    if (currentStatus === newStatus) {
      return NextResponse.json({ error: "Order is already in that status." }, { status: 400 });
    }

    const now     = new Date().toISOString();
    const shortId = `#CM-${orderId.slice(0, 8).toUpperCase()}`;

    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: now })
      .eq("id", orderId);
    if (updateErr) throw updateErr;

    const STATUS_LABELS = {
      confirmed:  "confirmed",
      processing: "being packed",
      shipped:    "out for delivery",
      delivered:  "delivered",
      cancelled:  "cancelled",
    };
    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;

    // Customer email + in-app notification (fire-and-forget)
    try {
      const { data: customer } = await admin
        .from("users")
        .select("email")
        .eq("id", order.customer_id)
        .single();

      if (customer?.email) {
        await sendOrderStatusUpdate({ to: customer.email, order, newStatus });
      }

      await admin.from("notifications").insert({
        user_id: order.customer_id,
        type:    "order_update",
        title:   `Order ${shortId} ${newStatus === "delivered" ? "Delivered!" : "Updated"}`,
        message: `Your order ${shortId} is now ${statusLabel}.`,
        link:    `/orders/${orderId}`,
      });
    } catch (err) {
      console.error("[rider/status] customer notification failed (non-fatal):", err.message);
    }

    // Credit vendor wallets on delivery (card-paid orders + POD where rider collected cash)
    if (newStatus === "delivered" && (order.payment_status === "paid" || order.payment_method === "pod")) {
      try {
        // POD: rider just collected cash — record payment as received
        if (order.payment_method === "pod") {
          await admin.from("orders")
            .update({ payment_status: "paid", updated_at: now })
            .eq("id", orderId);
        }

        const { data: items } = await admin
          .from("order_items")
          .select("vendor_id, total")
          .eq("order_id", orderId);

        if (items?.length) {
          const vendorTotals = {};
          for (const item of items) {
            vendorTotals[item.vendor_id] = (vendorTotals[item.vendor_id] ?? 0) + item.total;
          }

          const vendorIds = Object.keys(vendorTotals);

          const { data: vendorRows } = await admin
            .from("vendors")
            .select("id, subscription_tier")
            .in("id", vendorIds);
          const tierMap = Object.fromEntries(
            (vendorRows ?? []).map((v) => [v.id, v.subscription_tier ?? "free"])
          );

          const { data: rateOverrides } = await admin
            .from("commission_rates")
            .select("target_id, rate")
            .eq("type", "vendor")
            .in("target_id", vendorIds);
          const overrideMap = Object.fromEntries(
            (rateOverrides ?? []).map((r) => [r.target_id, Number(r.rate)])
          );

          for (const [vendorId, grossTotal] of Object.entries(vendorTotals)) {
            const tier           = tierMap[vendorId] ?? "free";
            const commissionRate = overrideMap[vendorId] ?? getCommissionRate(tier);
            const vendorEarning  = Math.round(grossTotal * (1 - commissionRate / 100));

            if (vendorEarning <= 0) continue;

            const { error: walletErr } = await admin.rpc("increment_wallet", {
              p_user_id: vendorId,
              p_amount:  vendorEarning,
            });
            if (walletErr) throw walletErr;

            await admin.from("wallet_transactions").insert({
              user_id:     vendorId,
              type:        "credit",
              amount:      vendorEarning,
              description: `Order ${shortId} delivered — after ${commissionRate}% commission`,
              reference:   orderId,
              created_at:  now,
            });
          }
        }
      } catch (commErr) {
        console.error("[rider/status] commission crediting failed:", commErr.message);
      }
    }

    // Vendor in-app notifications (fire-and-forget)
    try {
      const { data: vendorRows } = await admin
        .from("order_items")
        .select("vendor_id")
        .eq("order_id", orderId);

      const uniqueVendorIds = [...new Set((vendorRows ?? []).map((r) => r.vendor_id))];
      if (uniqueVendorIds.length > 0) {
        await admin.from("notifications").insert(
          uniqueVendorIds.map((vendorId) => ({
            user_id: vendorId,
            type:    "order_update",
            title:   `Order ${shortId} ${newStatus === "delivered" ? "Delivered" : "Status Updated"}`,
            message: `Order ${shortId} containing your item(s) is now ${statusLabel}.`,
            link:    `/vendor/orders`,
          }))
        );
      }
    } catch (err) {
      console.error("[rider/status] vendor notifications failed (non-fatal):", err.message);
    }

    return NextResponse.json({ success: true, new_status: newStatus });
  } catch (error) {
    console.error("[PATCH /api/rider/orders/[id]/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
