import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorise(supabase, adminClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await adminClient.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["accountant", "admin"].includes(profile.role)) return null;
  return user;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const caller = await authorise(supabase, admin);
    if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d"; // 7d | 30d | 90d | all
    const page  = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = 30;

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range];
    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // ── Fetch platform fee rate ───────────────────────────────────────────
    const { data: feeRow } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_fee_percent")
      .single();
    const FEE_RATE = Number(feeRow?.value ?? 10) / 100;

    // ── Parallel data fetches ─────────────────────────────────────────────
    let orderQ = admin
      .from("orders")
      .select("id, customer_id, status, total, delivery_address, payment_method, created_at", { count: "exact" })
      .order("created_at", { ascending: false });
    let payQ = admin.from("payments").select("amount, status, type, created_at");
    let payoutQ = admin.from("vendor_payouts").select("amount, status, created_at");
    let walletQ = admin.from("wallet_transactions").select("type, amount, created_at");

    if (since) {
      orderQ  = orderQ.gte("created_at", since);
      payQ    = payQ.gte("created_at", since);
      payoutQ = payoutQ.gte("created_at", since);
      walletQ = walletQ.gte("created_at", since);
    }

    // Paginated orders for the breakdown table
    const pagedOrderQ = orderQ.range((page - 1) * limit, page * limit - 1);

    const [
      { data: allOrders },
      { data: pagedOrders, count: orderCount },
      { data: payments },
      { data: payouts },
      { data: walletTxns },
    ] = await Promise.all([
      // All orders for summary metrics (no pagination)
      (() => {
        let q = admin.from("orders").select("id, status, total, delivery_address, created_at");
        if (since) q = q.gte("created_at", since);
        return q;
      })(),
      pagedOrderQ,
      payQ,
      payoutQ,
      walletQ,
    ]);

    // ── Aggregate summary metrics ─────────────────────────────────────────
    const completedOrders = (allOrders || []).filter(
      (o) => !["cancelled", "refunded", "pending"].includes(o.status),
    );
    const refundedOrders = (allOrders || []).filter((o) => o.status === "refunded");

    let gmv = 0, totalDeliveryFees = 0, totalProductRevenue = 0;
    for (const o of completedOrders) {
      const dFee = Number(o.delivery_address?.delivery_fee ?? 0);
      const subtotal = (o.total ?? 0) - dFee;
      gmv              += o.total ?? 0;
      totalDeliveryFees += dFee;
      totalProductRevenue += subtotal;
    }
    const platformFees   = Math.round(gmv * FEE_RATE);
    const totalRefunded  = refundedOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const gatewayReceipts = (payments || [])
      .filter((p) => p.status === "success")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const totalPayoutsCompleted = (payouts || [])
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + (p.amount ?? 0), 0);
    const totalPayoutsPending = (payouts || [])
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + (p.amount ?? 0), 0);

    const walletCredits = (walletTxns || []).filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const walletDebits  = (walletTxns || []).filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

    // ── Revenue trend chart (daily) ───────────────────────────────────────
    const chartDays = Math.min(days ?? 30, 30);
    const chartMap = {};
    for (let i = chartDays - 1; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      chartMap[key] = {
        date:     key,
        label:    i < 7 ? DAY_NAMES[d.getDay()] : d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
        gmv:      0,
        delivery: 0,
        platform: 0,
        product:  0,
      };
    }
    for (const o of completedOrders) {
      const key = o.created_at?.slice(0, 10);
      if (key && chartMap[key]) {
        const dFee     = Number(o.delivery_address?.delivery_fee ?? 0);
        const subtotal = (o.total ?? 0) - dFee;
        const pFee     = Math.round((o.total ?? 0) * FEE_RATE);
        chartMap[key].gmv      += o.total ?? 0;
        chartMap[key].delivery += dFee;
        chartMap[key].platform += pFee;
        chartMap[key].product  += subtotal;
      }
    }
    const revenueChart = Object.values(chartMap);

    // ── Order breakdown table (paginated) ────────────────────────────────
    // Bulk-fetch customer names
    const customerIds = [...new Set((pagedOrders || []).map((o) => o.customer_id).filter(Boolean))];
    let customerMap = {};
    if (customerIds.length > 0) {
      const { data: customers } = await admin
        .from("users")
        .select("id, email, first_name, last_name")
        .in("id", customerIds);
      customerMap = Object.fromEntries((customers || []).map((c) => [c.id, c]));
    }

    const orderBreakdown = (pagedOrders || []).map((o) => {
      const dFee       = Number(o.delivery_address?.delivery_fee ?? 0);
      const subtotal   = (o.total ?? 0) - dFee;
      const platformFee = Math.round((o.total ?? 0) * FEE_RATE);
      const c = customerMap[o.customer_id];
      const customerName = c
        ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email
        : "Unknown";
      return {
        id:            o.id,
        shortId:       `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        customer:      customerName,
        orderTotal:    o.total ?? 0,
        productAmount: subtotal,
        deliveryFee:   dFee,
        platformFee:   platformFee,
        paymentMethod: o.payment_method ?? "—",
        status:        o.status,
        date:          new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    return NextResponse.json({
      summary: {
        gmv,
        totalProductRevenue,
        totalDeliveryFees,
        platformFees,
        feeRate: FEE_RATE,
        totalRefunded,
        gatewayReceipts,
        totalPayoutsCompleted,
        totalPayoutsPending,
        walletCredits,
        walletDebits,
        orderCount: orderCount ?? 0,
        completedCount: completedOrders.length,
        refundedCount: refundedOrders.length,
      },
      revenueChart,
      orderBreakdown,
      pagination: {
        page,
        pages: Math.ceil((orderCount ?? 0) / limit),
        total: orderCount ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
