import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorise(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["accountant", "admin"].includes(profile.role)) return null;
  return user;
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();
    if (!await authorise(supabase, admin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range   = searchParams.get("range")  || "30d";
    const status  = searchParams.get("status") || null;   // all | pending | confirmed | …
    const payment = searchParams.get("payment") || null;  // card | pod | wallet | transfer
    const search  = searchParams.get("search")  || null;  // order shortId or customer email
    const page    = Math.max(1, Number(searchParams.get("page") || 1));
    const limit   = 30;

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days    = daysMap[range];
    const since   = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: feeRow } = await admin
      .from("platform_settings").select("value").eq("key", "platform_fee_percent").single();
    const FEE_RATE = Number(feeRow?.value ?? 10) / 100;

    // Build order query
    let q = admin
      .from("orders")
      .select("id, customer_id, status, total, delivery_address, payment_method, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (since)   q = q.gte("created_at", since);
    if (status)  q = q.eq("status", status);
    if (payment) q = q.eq("payment_method", payment);

    const { data: orderRows, count, error: qErr } = await q;
    if (qErr) throw qErr;

    // Resolve customer names
    const customerIds = [...new Set((orderRows || []).map((o) => o.customer_id).filter(Boolean))];
    let customerMap = {};
    if (customerIds.length) {
      const { data: customers } = await admin
        .from("users").select("id, email, first_name, last_name")
        .in("id", customerIds);
      customerMap = Object.fromEntries((customers || []).map((c) => [c.id, c]));
    }

    let orders = (orderRows || []).map((o) => {
      const dFee       = Number(o.delivery_address?.delivery_fee ?? 0);
      const subtotal   = (o.total ?? 0) - dFee;
      const platformFee = Math.round((o.total ?? 0) * FEE_RATE);
      const c = customerMap[o.customer_id];
      const customerName = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email : "Unknown";
      return {
        id:            o.id,
        shortId:       `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        customer:      customerName,
        customerEmail: c?.email ?? null,
        orderTotal:    o.total ?? 0,
        productAmount: subtotal,
        deliveryFee:   dFee,
        platformFee,
        paymentMethod: o.payment_method ?? "—",
        status:        o.status,
        date:          new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        rawDate:       o.created_at,
      };
    });

    // Client-side search filter (order shortId or customer name/email)
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.shortId.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(q)),
      );
    }

    // Summary for current filter
    const completedOrders = orders.filter((o) => !["cancelled", "refunded", "pending"].includes(o.status));
    const summaryGmv      = completedOrders.reduce((s, o) => s + o.orderTotal, 0);
    const summaryFees     = completedOrders.reduce((s, o) => s + o.platformFee, 0);
    const summaryDelivery = completedOrders.reduce((s, o) => s + o.deliveryFee, 0);

    return NextResponse.json({
      orders,
      feeRate: FEE_RATE,
      summary: { gmv: summaryGmv, platformFees: summaryFees, deliveryFees: summaryDelivery },
      pagination: { page, pages: Math.ceil((count ?? 0) / limit), total: count ?? 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
