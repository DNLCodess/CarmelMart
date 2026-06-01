import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendVendorNewOrder } from "@/lib/email";

const FLUTTERWAVE_TIMEOUT_MS = 10_000;

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toPositiveInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

async function verifyFlutterwaveTransaction(transactionId, expectedAmount, expectedTxRef, expectedEmail) {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    throw new Error("Payment verification is not configured.");
  }

  if (!transactionId) {
    return { ok: false, error: "Payment transaction ID is required." };
  }

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(FLUTTERWAVE_TIMEOUT_MS),
    },
  );

  const data = await res.json();
  const tx = data?.data;

  if (!res.ok || data.status !== "success" || tx?.status !== "successful") {
    return { ok: false, error: "Payment verification failed." };
  }

  if (tx.currency !== "NGN") {
    return { ok: false, error: "Invalid payment currency." };
  }

  if (expectedTxRef && tx.tx_ref !== expectedTxRef) {
    return { ok: false, error: "Payment reference mismatch." };
  }

  if (
    expectedEmail &&
    tx.customer?.email &&
    tx.customer.email.toLowerCase() !== expectedEmail.toLowerCase()
  ) {
    return { ok: false, error: "Payment customer mismatch." };
  }

  if (Number(tx.charged_amount ?? tx.amount) < expectedAmount) {
    return { ok: false, error: "Verified payment amount is lower than the order amount." };
  }

  return { ok: true, data: tx };
}

async function calculatePromoDiscount(admin, userId, promoId, subtotal) {
  if (!promoId) return { promoId: null, discount: 0 };

  const { data: promo, error } = await admin
    .from("promo_codes")
    .select("id, type, value, min_order, max_uses, used_count, expires_at, active")
    .eq("id", promoId)
    .single();

  if (error || !promo || !promo.active) {
    throw new Error("Invalid promo code.");
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    throw new Error("Promo code has expired.");
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    throw new Error("Promo code has reached its usage limit.");
  }

  if (subtotal < promo.min_order) {
    throw new Error("Order total is below the promo code minimum.");
  }

  const { count } = await admin
    .from("promo_code_uses")
    .select("id", { count: "exact", head: true })
    .eq("promo_id", promo.id)
    .eq("user_id", userId);

  if ((count ?? 0) > 0) {
    throw new Error("You have already used this promo code.");
  }

  const rawDiscount = promo.type === "percentage"
    ? Math.round(subtotal * (promo.value / 100))
    : promo.value;

  return { promoId: promo.id, discount: Math.min(subtotal, Math.max(0, rawDiscount)) };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return jsonError("Unauthorized", 401);

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

// POST /api/customer/orders - create an order after verified payment/server-side pricing.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonError("Unauthorized", 401);

    const body = await request.json();
    const {
      items,
      delivery_address,
      payment_method,
      payment_ref,
      payment_transaction_id,
      promo_id,
    } = body;

    if (!items?.length) return jsonError("Cart is empty");

    const admin = createAdminClient();
    const normalizedItems = items.map((item) => ({
      productId:      item.productId,
      quantity:       toPositiveInt(item.quantity, 1),
      deliveryFormat: item.delivery_format === "digital" ? "digital" : "physical",
    }));

    const productIds = [...new Set(normalizedItems.map((i) => i.productId).filter(Boolean))];
    if (productIds.length !== normalizedItems.length) {
      return jsonError("Cart contains duplicate or invalid products.");
    }

    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, name, price, sale_price, stock, vendor_id, is_digital, digital_price")
      .in("id", productIds)
      .eq("status", "active")
      .eq("moderation_status", "approved");

    if (prodErr) throw prodErr;

    const productMap = Object.fromEntries((products ?? []).map((p) => [p.id, p]));

    for (const item of normalizedItems) {
      const prod = productMap[item.productId];
      if (!prod) return jsonError("One or more products are no longer available.");
      // Digital items don't need stock; physical items do
      if (item.deliveryFormat === "physical" && prod.stock < item.quantity) {
        return jsonError(`Insufficient stock for: ${prod.name}`);
      }
      if (item.deliveryFormat === "digital" && !prod.is_digital) {
        return jsonError(`${prod.name} is not available as a digital download.`);
      }
    }

    const orderItems = normalizedItems.map((item) => {
      const product = productMap[item.productId];
      // Server-side authoritative price based on chosen delivery format
      const unitPrice = item.deliveryFormat === "digital" && product.is_digital && product.digital_price
        ? Math.round(product.digital_price)
        : Math.round(product.sale_price ?? product.price);
      return {
        product_id:      item.productId,
        vendor_id:       product.vendor_id,
        quantity:        item.quantity,
        unit_price:      unitPrice,
        total:           unitPrice * item.quantity,
        name:            product.name,
        delivery_format: item.deliveryFormat,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const deliveryFee = toPositiveInt(delivery_address?.delivery_fee, 0);
    const { promoId, discount } = await calculatePromoDiscount(admin, user.id, promo_id, subtotal);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const total = discountedSubtotal + deliveryFee;

    const verification = await verifyFlutterwaveTransaction(
      payment_transaction_id,
      total,
      payment_ref,
      delivery_address?.email ?? user.email,
    );

    if (!verification.ok) return jsonError(verification.error, 400);

    const { data: orderId, error: createErr } = await admin.rpc("create_customer_order_atomic", {
      p_customer_id: user.id,
      p_items: orderItems,
      p_delivery_address: {
        ...(delivery_address ?? {}),
        delivery_fee: deliveryFee,
      },
      p_payment_method: "card",
      p_payment_status: "paid",
      p_payment_ref: payment_ref ?? verification.data?.tx_ref ?? null,
      p_pod_deposit: 0,
      p_discount: discount,
      p_promo_id: promoId,
      p_total: total,
      p_order_status: "confirmed",
    });

    if (createErr) throw createErr;

    sendOrderConfirmation({
      to: user.email,
      order: {
        id: orderId,
        items: orderItems.map((item) => ({ ...item, productId: item.product_id })),
        delivery_address,
        delivery_fee: deliveryFee,
        payment_method: "card",
        discount,
        total,
      },
    });

    const vendorGroups = {};
    for (const item of orderItems) {
      if (!vendorGroups[item.vendor_id]) vendorGroups[item.vendor_id] = [];
      vendorGroups[item.vendor_id].push({ ...item, productId: item.product_id, name: item.name });
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
            to: vendorUser.email,
            order: { id: orderId, delivery_address, payment_method: "card" },
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
