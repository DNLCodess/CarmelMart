import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusUpdate } from "@/lib/email";
import { getCommissionRate } from "@/lib/subscription";

// Logistics admins can only move orders through delivery states.
// Refunds / cancellations require super admin or an authorized auth_request.
const ALLOWED_TRANSITIONS = {
  pending:    ["confirmed", "processing"],
  confirmed:  ["processing", "shipped"],
  processing: ["shipped"],
  shipped:    ["delivered"],
};

async function guardLogistics() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role, status").eq("id", user.id).single();
  if (!profile || !["admin", "logistics_admin", "rider"].includes(profile.role)) {
    return { error: "Forbidden", status: 403 };
  }
  if (profile.role === "rider" && (profile.status === "suspended" || profile.status === "banned")) {
    return { error: "Account suspended.", status: 403 };
  }
  return { user, admin, role: profile.role };
}

/**
 * PATCH /api/logistics/orders/[id]/status
 * Body: { status: 'confirmed' | 'processing' | 'shipped' | 'delivered', note? }
 *
 * Logistics admins: limited to delivery progression states only.
 * Super admins: can also set cancelled (but refunds still go via auth_requests).
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin, role } = guard;
    const { id: orderId } = await params;

    const body = await request.json();
    const { status: newStatus, note } = body;

    if (!newStatus) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    // Fetch current order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, customer_id, total, payment_method, delivery_address")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Validate transition
    const currentStatus = order.status;

    // Riders can only update orders assigned to them
    if (role === "rider" && order.rider_id !== user.id) {
      return NextResponse.json(
        { error: "This order is not assigned to you." },
        { status: 403 }
      );
    }

    if (role === "logistics_admin" || role === "rider") {
      // Strict delivery-state transitions only
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot move order from '${currentStatus}' to '${newStatus}'. Allowed next states: [${allowed.join(", ")}].`,
            code:  "INVALID_TRANSITION",
          },
          { status: 400 }
        );
      }
    } else {
      // Super admin: allow all except refunded (that goes through auth_request / refund API)
      const allStates = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
      if (!allStates.includes(newStatus)) {
        return NextResponse.json({ error: `Invalid status '${newStatus}'.` }, { status: 400 });
      }
      if (newStatus === "refunded") {
        return NextResponse.json(
          { error: "Use the refund endpoint to issue refunds." },
          { status: 400 }
        );
      }
    }

    if (currentStatus === newStatus) {
      return NextResponse.json({ error: "Order is already in that status." }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update order status
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: now })
      .eq("id", orderId);
    if (updateErr) throw updateErr;

    // Build a short display ID for notification messages
    const shortId = `#CM-${orderId.slice(0, 8).toUpperCase()}`;

    const STATUS_LABELS = {
      confirmed:  "confirmed",
      processing: "being packed",
      shipped:    "out for delivery",
      delivered:  "delivered",
      cancelled:  "cancelled",
    };
    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;

    // Send status update email to customer + insert in-app notification (fire-and-forget)
    try {
      const { data: customer } = await admin
        .from("users")
        .select("email")
        .eq("id", order.customer_id)
        .single();

      // Email
      if (customer?.email) {
        await sendOrderStatusUpdate({ to: customer.email, order, newStatus });
      }

      // In-app notification for customer
      await admin.from("notifications").insert({
        user_id: order.customer_id,
        type:    "order_update",
        title:   `Order ${shortId} ${newStatus === "delivered" ? "Delivered!" : "Updated"}`,
        message: `Your order ${shortId} is now ${statusLabel}.`,
        link:    `/orders/${orderId}`,
      });
    } catch (err) {
      console.error("[status] customer notification failed (non-fatal):", err.message);
    }

    // Credit vendor wallets with commission deducted on delivery
    if (newStatus === "delivered" && order.payment_status === "paid") {
      try {
        // Fetch all items grouped by vendor for this order
        const { data: items } = await admin
          .from("order_items")
          .select("vendor_id, total")
          .eq("order_id", orderId);

        if (items?.length) {
          // Sum totals per vendor
          const vendorTotals = {};
          for (const item of items) {
            vendorTotals[item.vendor_id] = (vendorTotals[item.vendor_id] ?? 0) + item.total;
          }

          const vendorIds = Object.keys(vendorTotals);

          // Fetch subscription tiers for all vendors in this order
          const { data: vendorRows } = await admin
            .from("vendors")
            .select("id, subscription_tier")
            .in("id", vendorIds);
          const tierMap = Object.fromEntries((vendorRows ?? []).map((v) => [v.id, v.subscription_tier ?? "free"]));

          // Fetch any vendor-specific commission overrides from commission_rates table
          const { data: rateOverrides } = await admin
            .from("commission_rates")
            .select("target_id, rate")
            .eq("type", "vendor")
            .in("target_id", vendorIds);
          const overrideMap = Object.fromEntries((rateOverrides ?? []).map((r) => [r.target_id, Number(r.rate)]));

          // Credit each vendor
          for (const [vendorId, grossTotal] of Object.entries(vendorTotals)) {
            const tier           = tierMap[vendorId] ?? "free";
            const commissionRate = overrideMap[vendorId] ?? getCommissionRate(tier); // % to platform
            const vendorEarning  = Math.round(grossTotal * (1 - commissionRate / 100));

            if (vendorEarning <= 0) continue;

            // Credit wallet balance atomically
            const { error: walletErr } = await admin.rpc("increment_wallet", {
              p_user_id: vendorId,
              p_amount:  vendorEarning,
            });
            if (walletErr) throw walletErr;

            // Record wallet transaction
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
        // Non-fatal: log but don't block the status update
        console.error("[status] commission crediting failed:", commErr.message);
      }
    }

    // In-app notifications for each vendor whose items are in the order (fire-and-forget)
    try {
      const { data: vendorRows } = await admin
        .from("order_items")
        .select("vendor_id")
        .eq("order_id", orderId);

      const uniqueVendorIds = [...new Set((vendorRows ?? []).map((r) => r.vendor_id))];

      if (uniqueVendorIds.length > 0) {
        const vendorNotifications = uniqueVendorIds.map((vendorId) => ({
          user_id: vendorId,
          type:    "order_update",
          title:   `Order ${shortId} ${newStatus === "delivered" ? "Delivered" : "Status Updated"}`,
          message: `Order ${shortId} containing your item(s) is now ${statusLabel}.`,
          link:    `/vendor/orders`,
        }));
        await admin.from("notifications").insert(vendorNotifications);
      }
    } catch (err) {
      console.error("[status] vendor notifications failed (non-fatal):", err.message);
    }

    return NextResponse.json({ success: true, new_status: newStatus });
  } catch (error) {
    console.error("[PATCH /api/logistics/orders/[id]/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
