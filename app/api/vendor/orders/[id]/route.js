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
        variant_id, variant_combination,
        products ( id, name, images )
      `)
      .eq("order_id", id)
      .eq("vendor_id", user.id);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, customer_id, status, total, created_at, delivery_address, payment_method, payment_status, payment_ref")
      .eq("id", id)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Fetch customer info from public.users
    const { data: customerUser } = order.customer_id
      ? await admin.from("users").select("first_name, last_name, email, phone").eq("id", order.customer_id).single()
      : { data: null };

    const addr = order.delivery_address ?? {};
    const customerName = [customerUser?.first_name, customerUser?.last_name].filter(Boolean).join(" ") || customerUser?.email || "Customer";

    const deliveryFee   = addr.delivery_fee ?? 0;
    const itemsSubtotal = items.reduce((s, it) => s + (it.total ?? it.unit_price * it.quantity), 0);

    return NextResponse.json({
      order: {
        id:             order.id,
        shortId:        `#CM-${order.id.slice(0, 8).toUpperCase()}`,
        status:         order.status,
        amount:         order.total,
        items_subtotal: itemsSubtotal,
        delivery_fee:   deliveryFee,
        payment_method: order.payment_method ?? null,
        payment_status: order.payment_status ?? null,
        payment_ref:    order.payment_ref ?? null,
        date:           new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        customer:       customerName,
        phone:          customerUser?.phone ?? addr.phone ?? null,
        delivery_address: addr,
        order_items: items.map((it) => ({
          id:           it.id,
          product_id:   it.products?.id ?? null,
          product_name: it.products?.name ?? "Product",
          image:        Array.isArray(it.products?.images) ? it.products.images[0] : null,
          quantity:            it.quantity,
          unit_price:          it.unit_price,
          total:               it.total ?? it.unit_price * it.quantity,
          variant_id:          it.variant_id ?? null,
          variant_combination: it.variant_combination ?? null,
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
  const { data: profile } = await admin.from("users").select("role, status").eq("id", user.id).single();
  if (!profile || profile.role !== "vendor") return null;
  if (profile.status === "suspended" || profile.status === "banned") return null;
  return user;
}

// PATCH /api/vendor/orders/[id] — update order status (vendor scope)
export async function PATCH(request, { params }) {
  try {
    const user = await verifyVendor();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { status } = await request.json();

    const allowed = ["confirmed", "shipped", "delivered"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch order and confirm vendor owns an item in it
    const [{ data: currentOrder }, { data: item }] = await Promise.all([
      admin.from("orders").select("id, status, payment_status, payment_method").eq("id", id).single(),
      admin.from("order_items").select("id").eq("order_id", id).eq("vendor_id", user.id).limit(1).single(),
    ]);

    if (!item) return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Enforce forward-only transitions — vendor cannot jump directly to "delivered"
    // from "pending" or "confirmed" (would bypass dispatch/shipping steps).
    const ALLOWED_TRANSITIONS = {
      pending:    ["confirmed"],
      confirmed:  ["processing", "shipped"],
      processing: ["shipped"],
      shipped:    ["delivered"],
    };
    const validNext = ALLOWED_TRANSITIONS[currentOrder.status] ?? [];
    if (!validNext.includes(status)) {
      return NextResponse.json(
        { error: `Cannot move order from '${currentOrder.status}' to '${status}'.` },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Credit only THIS vendor's wallet on delivery (self-fulfilled orders — no rider).
    // We scope strictly to the calling vendor's items to prevent privilege escalation
    // in multi-vendor orders where vendor A cannot trigger credits for vendors B/C.
    if (status === "delivered") {
      try {
        const shouldCredit = currentOrder.payment_status === "paid";

        if (shouldCredit) {
          // Only this vendor's items, not all vendors in the order
          const { data: myItems } = await admin
            .from("order_items")
            .select("total, product_id")
            .eq("order_id", id)
            .eq("vendor_id", user.id);

          if ((myItems ?? []).length > 0) {
            // Idempotency: skip if already credited (guards against duplicate calls)
            const { count: alreadyCredited } = await admin
              .from("wallet_transactions")
              .select("id", { count: "exact", head: true })
              .eq("reference", id)
              .eq("user_id", user.id)
              .eq("type", "credit");

            if ((alreadyCredited ?? 0) === 0) {
              const productIds = [...new Set(myItems.map((i) => i.product_id).filter(Boolean))];

              const [
                { data: vendorRow },
                { data: allRateOverrides },
                { data: platformFeeRow },
              ] = await Promise.all([
                admin.from("vendors").select("subscription_tier").eq("id", user.id).single(),
                admin.from("commission_rates").select("target_id, rate, type").in("type", ["vendor", "category"]),
                admin.from("platform_settings").select("value").eq("key", "platform_fee_percent").single(),
              ]);

              let productCategoryMap = {};
              if (productIds.length > 0) {
                const { data: productRows } = await admin
                  .from("products").select("id, category_id").in("id", productIds);
                productCategoryMap = Object.fromEntries((productRows ?? []).map((p) => [p.id, p.category_id]));
              }

              const tier = vendorRow?.subscription_tier ?? "free";
              const platformDefaultRate = Number(platformFeeRow?.value ?? getCommissionRate("free"));
              const vendorOverrideRow = (allRateOverrides ?? []).find(
                (r) => r.type === "vendor" && r.target_id === user.id
              );
              const categoryOverrideMap = Object.fromEntries(
                (allRateOverrides ?? []).filter((r) => r.type === "category").map((r) => [r.target_id, Number(r.rate)])
              );

              // Sum earning per item — priority: vendor override → category override → tier default
              let vendorEarning = 0;
              for (const item of myItems) {
                const categoryId = productCategoryMap[item.product_id];
                let rate;
                if (vendorOverrideRow) {
                  rate = Number(vendorOverrideRow.rate);
                } else if (categoryId && categoryOverrideMap[categoryId] !== undefined) {
                  rate = categoryOverrideMap[categoryId];
                } else {
                  rate = tier === "free" ? platformDefaultRate : getCommissionRate(tier);
                }
                vendorEarning += Math.round((item.total ?? 0) * (1 - rate / 100));
              }

              if (vendorEarning > 0) {
                const now     = new Date().toISOString();
                const shortId = `#CM-${id.slice(0, 8).toUpperCase()}`;

                const { error: walletErr } = await admin.rpc("increment_wallet", {
                  p_user_id: user.id,
                  p_amount:  vendorEarning,
                });
                if (walletErr) throw walletErr;

                await admin.from("wallet_transactions").insert({
                  user_id:     user.id,
                  type:        "credit",
                  amount:      vendorEarning,
                  description: `Order ${shortId} delivered (vendor fulfilled) — after commission`,
                  reference:   id,
                  created_at:  now,
                });
              }
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
