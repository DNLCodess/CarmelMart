import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendVendorNewOrder } from "@/lib/email";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: orders, error: qErr } = await admin
      .from("orders")
      .select(`
        id, status, total, created_at, delivery_address,
        order_items ( id, quantity, unit_price, total,
          products ( name, images )
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (qErr) throw qErr;

    const normalized = (orders ?? []).map((o) => ({
      id:              o.id,
      shortId:         `#CM-${o.id.slice(0, 8).toUpperCase()}`,
      status:          o.status,
      total:           o.total,
      date:            new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      itemCount:       o.order_items?.length ?? 0,
      firstItem:       o.order_items?.[0]?.products?.name ?? "Order",
      firstImage:      o.order_items?.[0]?.products?.images?.[0] ?? null,
      deliveryAddress: o.delivery_address,
    }));

    return NextResponse.json({ orders: normalized });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/customer/orders — create an order after payment
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      items,           // [{ productId, vendorId, name, price, quantity }]
      delivery_address,
      payment_method,  // "card" | "bank_transfer" | "ussd" | "pod"
      payment_ref,
      payment_status,  // "paid" | "pending"
      promo_id,
      discount,
      subtotal,
      total,
      pod_deposit,
    } = body;

    if (!items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate products exist and have stock
    const productIds = items.map((i) => i.productId);
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, name, price, sale_price, stock, vendor_id")
      .in("id", productIds)
      .eq("status", "active");

    if (prodErr) throw prodErr;

    const productMap = Object.fromEntries((products ?? []).map((p) => [p.id, p]));

    for (const item of items) {
      const prod = productMap[item.productId];
      if (!prod) return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 400 });
      if (prod.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for: ${item.name}` }, { status: 400 });
      }
    }

    // Determine order status
    const orderStatus = payment_status === "paid" ? "confirmed" : "pending";

    // Create order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        customer_id:      user.id,
        status:           orderStatus,
        total:            total ?? subtotal,
        payment_method:   payment_method ?? "card",
        payment_status:   payment_status ?? "pending",
        payment_ref:      payment_ref ?? null,
        pod_deposit:      pod_deposit ?? 0,
        delivery_address: delivery_address ?? {},
        notes:            null,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    const orderId = order.id;

    // Create order items — fall back to the vendor_id from the DB if cart item is missing it
    const orderItems = items.map((item) => {
      const unitPrice = Math.round(item.price);
      const vendorId  = item.vendorId ?? productMap[item.productId]?.vendor_id ?? null;
      if (!vendorId) throw new Error(`Could not resolve vendor for product: ${item.name}`);
      return {
        order_id:   orderId,
        product_id: item.productId,
        vendor_id:  vendorId,
        quantity:   item.quantity,
        unit_price: unitPrice,
        total:      unitPrice * item.quantity,
      };
    });

    const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
    if (itemsErr) throw itemsErr;

    // Decrement stock for each product
    for (const item of items) {
      const prod = productMap[item.productId];
      await admin
        .from("products")
        .update({ stock: Math.max(0, prod.stock - item.quantity) })
        .eq("id", item.productId);
    }

    // Record promo code usage
    if (promo_id && discount > 0) {
      await admin.from("promo_code_uses").insert({
        promo_id,
        user_id:  user.id,
        order_id: orderId,
        discount: discount,
      });
    }

    // ── Fire-and-forget email notifications ───────────────────────────────────

    // Customer confirmation
    sendOrderConfirmation({
      to:    user.email,
      order: {
        id:               orderId,
        items,
        delivery_address,
        delivery_fee:     delivery_address?.delivery_fee ?? 0,
        payment_method:   payment_method ?? "card",
        discount:         discount ?? 0,
        total:            total ?? subtotal,
      },
    });

    // Per-vendor new order email
    const vendorGroups = {};
    for (const item of items) {
      if (!vendorGroups[item.vendorId]) vendorGroups[item.vendorId] = [];
      vendorGroups[item.vendorId].push(item);
    }

    const vendorIds = Object.keys(vendorGroups);
    if (vendorIds.length > 0) {
      const { data: vendorUsers } = await admin
        .from("users")
        .select("id, email")
        .in("id", vendorIds);

      for (const vendorUser of (vendorUsers ?? [])) {
        if (vendorUser.email) {
          sendVendorNewOrder({
            to:          vendorUser.email,
            order:       { id: orderId, delivery_address, payment_method: payment_method ?? "card" },
            vendorItems: vendorGroups[vendorUser.id],
          });
        }
      }
    }

    return NextResponse.json({ success: true, order_id: orderId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
