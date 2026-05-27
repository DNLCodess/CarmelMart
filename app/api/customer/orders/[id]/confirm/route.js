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
          .select("vendor_id, total, product_id")
          .eq("order_id", id);

        if (items?.length) {
          const vendorIds  = [...new Set(items.map((i) => i.vendor_id))];
          const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];

          const [
            { data: vendorRows },
            { data: allRateOverrides },
            { data: platformFeeRow },
          ] = await Promise.all([
            admin.from("vendors").select("id, subscription_tier").in("id", vendorIds),
            admin.from("commission_rates").select("target_id, rate, type").in("type", ["vendor", "category"]),
            admin.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
          ]);

          let productCategoryMap = {};
          if (productIds.length > 0) {
            const { data: productRows } = await admin
              .from("products").select("id, category_id").in("id", productIds);
            productCategoryMap = Object.fromEntries((productRows ?? []).map((p) => [p.id, p.category_id]));
          }

          const platformDefaultRate = Number(platformFeeRow?.value ?? getCommissionRate("free"));
          const tierMap = Object.fromEntries(
            (vendorRows ?? []).map((v) => [v.id, v.subscription_tier ?? "free"])
          );
          const vendorOverrideMap = Object.fromEntries(
            (allRateOverrides ?? []).filter((r) => r.type === "vendor").map((r) => [r.target_id, Number(r.rate)])
          );
          const categoryOverrideMap = Object.fromEntries(
            (allRateOverrides ?? []).filter((r) => r.type === "category").map((r) => [r.target_id, Number(r.rate)])
          );

          // Compute per-vendor earnings by summing per-item commissions.
          // Priority: vendor override → item's category override → tier default
          // (free-tier default comes from platform_settings so admin can change it without a deploy)
          const vendorEarningsMap = {};
          for (const item of items) {
            const vid        = item.vendor_id;
            const categoryId = productCategoryMap[item.product_id];
            const tier       = tierMap[vid] ?? "free";
            let rate;
            if (vendorOverrideMap[vid] !== undefined) {
              rate = vendorOverrideMap[vid];
            } else if (categoryId && categoryOverrideMap[categoryId] !== undefined) {
              rate = categoryOverrideMap[categoryId];
            } else {
              rate = tier === "free" ? platformDefaultRate : getCommissionRate(tier);
            }
            vendorEarningsMap[vid] = (vendorEarningsMap[vid] ?? 0) + Math.round((item.total ?? 0) * (1 - rate / 100));
          }

          for (const [vendorId, vendorEarning] of Object.entries(vendorEarningsMap)) {
            if (vendorEarning <= 0) continue;

            // Idempotency: skip if this vendor was already credited for this order
            const { count: alreadyCredited } = await admin
              .from("wallet_transactions")
              .select("id", { count: "exact", head: true })
              .eq("reference", id)
              .eq("user_id", vendorId)
              .eq("type", "credit");
            if ((alreadyCredited ?? 0) > 0) continue;

            const { error: walletErr } = await admin.rpc("increment_wallet", {
              p_user_id: vendorId,
              p_amount:  vendorEarning,
            });
            if (walletErr) throw walletErr;

            await admin.from("wallet_transactions").insert({
              user_id:     vendorId,
              type:        "credit",
              amount:      vendorEarning,
              description: `Order ${shortId} delivered (customer confirmed) — after commission`,
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
