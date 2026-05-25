import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusUpdate } from "@/lib/email";
import { getCommissionRate } from "@/lib/subscription";

// GET /api/vendor/orders/[id] — full order detail for vendor
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Confirm vendor owns items in this order
    const { data: items } = await admin
      .from("order_items")
      .select(`
        id, quantity, unit_price, total,
        products ( id, name, images )
      `)
      .eq("order_id", id)
      .eq("vendor_id", user.id);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, customer_id, status, total, created_at, delivery_address, payment_method")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Fetch customer info from public.users
    const { data: customerUser } = order.customer_id
      ? await admin.from("users").select("first_name, last_name, email, phone").eq("id", order.customer_id).single()
      : { data: null };

    const addr = order.delivery_address ?? {};
    const customerName = [customerUser?.first_name, customerUser?.last_name].filter(Boolean).join(" ") || customerUser?.email || "Customer";

    return NextResponse.json({
      order: {
        id:       order.id,
        shortId:  `#CM-${order.id.slice(0, 8).toUpperCase()}`,
        status:   order.status,
        amount:   order.total,
        payment_method: order.payment_method ?? null,
        date:     new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        customer: customerName,
        phone:    customerUser?.phone ?? addr.phone ?? null,
        delivery_address: addr,
        order_items: items.map((it) => ({
          id:           it.id,
          product_id:   it.products?.id ?? null,
          product_name: it.products?.name ?? "Product",
          image:        Array.isArray(it.products?.images) ? it.products.images[0] : null,
          quantity:     it.quantity,
          unit_price:   it.unit_price,
          total:        it.total ?? it.unit_price * it.quantity,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function verifyVendor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  return profile?.role === "vendor" ? user : null;
}

// PATCH /api/vendor/orders/[id] — update order status (vendor scope)
export async function PATCH(request, { params }) {
  try {
    const user = await verifyVendor();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { status, tracking_number } = await request.json();

    const allowed = ["confirmed", "shipped", "delivered"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Confirm vendor owns an item in this order
    const { data: item } = await admin
      .from("order_items")
      .select("id")
      .eq("order_id", id)
      .eq("vendor_id", user.id)
      .limit(1)
      .single();

    if (!item) return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });

    const updatePayload = { status, updated_at: new Date().toISOString() };
    if (tracking_number != null) updatePayload.tracking_number = tracking_number;

    const { error } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;

    // Credit vendor wallets on delivery (self-fulfilled orders — no rider)
    if (status === "delivered") {
      try {
        const { data: fullOrder } = await admin
          .from("orders")
          .select("payment_status")
          .eq("id", id)
          .single();

        if (fullOrder?.payment_status === "paid") {
          const { data: allItems } = await admin
            .from("order_items")
            .select("vendor_id, total")
            .eq("order_id", id);

          if (allItems?.length) {
            const vendorTotals = {};
            for (const it of allItems) {
              vendorTotals[it.vendor_id] = (vendorTotals[it.vendor_id] ?? 0) + it.total;
            }
            const vendorIds = Object.keys(vendorTotals);
            const [{ data: vendorRows }, { data: rateOverrides }] = await Promise.all([
              admin.from("vendors").select("id, subscription_tier").in("id", vendorIds),
              admin.from("commission_rates").select("target_id, rate").eq("type", "vendor").in("target_id", vendorIds),
            ]);
            const tierMap     = Object.fromEntries((vendorRows     ?? []).map((v) => [v.id, v.subscription_tier ?? "free"]));
            const overrideMap = Object.fromEntries((rateOverrides  ?? []).map((r) => [r.target_id, Number(r.rate)]));
            const now      = new Date().toISOString();
            const shortId  = `#CM-${id.slice(0, 8).toUpperCase()}`;

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
                description: `Order ${shortId} delivered (vendor fulfilled) — after ${commissionRate}% commission`,
                reference:   id,
                created_at:  now,
              });
            }
          }
        }
      } catch (commErr) {
        console.error("[vendor/orders/patch] commission crediting failed:", commErr.message);
      }
    }

    // Notify customer of status change
    const { data: orderRow } = await admin
      .from("orders").select("id, customer_id").eq("id", id).single();
    const { data: custRow } = orderRow?.customer_id
      ? await admin.from("users").select("email").eq("id", orderRow.customer_id).single()
      : { data: null };

    const customerEmail = custRow?.email;
    if (customerEmail) {
      sendOrderStatusUpdate({ to: customerEmail, order: { id }, newStatus: status });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
