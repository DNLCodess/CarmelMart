import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptConfirmed, sendVendorOrderDelivered } from "@/lib/email";
import { getCommissionRate } from "@/lib/subscription";

// POST /api/customer/orders/[id]/confirm
// Customer confirms they received the order — sets status to "delivered" and credits vendor wallets.
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    // Verify order belongs to customer and is in a confirmable state.
    // Only "shipped" is valid — the order must be in transit before the customer can confirm receipt.
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, payment_status, payment_method, customer_id, total, delivery_address")
      .eq("id", id)
      .eq("customer_id", user.id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "shipped") {
      return NextResponse.json(
        { error: `Cannot confirm receipt for an order with status: ${order.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const shortId = `#CM-${id.slice(0, 8).toUpperCase()}`;

    // Update order to delivered
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "delivered", updated_at: now })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // ── Credit vendor wallets (same logic as rider delivery route) ────────────
    if (order.payment_status === "paid" || order.payment_method === "pod") {
      try {
        // POD: customer just confirmed receipt — record payment as received
        if (order.payment_method === "pod") {
          await admin.from("orders")
            .update({ payment_status: "paid", updated_at: now })
            .eq("id", id);
        }

        const { data: items } = await admin
          .from("order_items")
          .select("vendor_id, total")
          .eq("order_id", id);

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
              description: `Order ${shortId} delivered (customer confirmed) — after ${commissionRate}% commission`,
              reference:   id,
              created_at:  now,
            });
          }
        }
      } catch (commErr) {
        console.error("[customer/confirm] commission crediting failed:", commErr.message);
      }
    }

    // ── Fire-and-forget email notifications ───────────────────────────────────

    sendReceiptConfirmed({ to: user.email, order: { id } });

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
