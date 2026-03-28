import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: me } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d"; // 7d | 30d | 90d | all

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range];
    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Total GMV (all delivered/confirmed orders in range)
    let orderQuery = admin.from("orders").select("total, status, created_at");
    if (since) orderQuery = orderQuery.gte("created_at", since);
    const { data: ordersData } = await orderQuery;

    const gmv = (ordersData || [])
      .filter((o) => !["cancelled", "refunded", "pending"].includes(o.status))
      .reduce((s, o) => s + (o.total ?? 0), 0);

    const totalRefunded = (ordersData || [])
      .filter((o) => o.status === "refunded")
      .reduce((s, o) => s + (o.total ?? 0), 0);

    // Payment gateway receipts
    let payQuery = admin.from("payments").select("amount, status, type, created_at");
    if (since) payQuery = payQuery.gte("created_at", since);
    const { data: paymentsData } = await payQuery;

    const gatewayReceipts = (paymentsData || [])
      .filter((p) => p.status === "success" || p.status === "completed")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);

    // Platform fee: 5% of GMV (configurable in future via platform_settings)
    const PLATFORM_FEE_RATE = 0.05;
    const platformFees = Math.round(gmv * PLATFORM_FEE_RATE);

    // Total wallet balances across all users
    const { data: walletData } = await admin
      .from("users")
      .select("wallet_balance")
      .gt("wallet_balance", 0);
    const totalWalletBalances = (walletData || []).reduce((s, u) => s + (u.wallet_balance ?? 0), 0);

    // Wallet transaction audit log
    let txQuery = admin
      .from("wallet_transactions")
      .select(`
        id, type, amount, description, reference, created_at,
        users!user_id ( email, role )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (since) txQuery = txQuery.gte("created_at", since);
    const { data: txData } = await txQuery;

    const walletCredits = (txData || []).filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const walletDebits  = (txData || []).filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

    const transactions = (txData || []).map((t) => ({
      id:          t.id,
      type:        t.type,
      amount:      t.amount,
      description: t.description,
      reference:   t.reference,
      userEmail:   t.users?.email ?? "Unknown",
      userRole:    t.users?.role  ?? "—",
      date:        new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    }));

    // Revenue trend: daily GMV for charting
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chartDays = Math.min(days ?? 30, 30);
    const chartMap = {};
    for (let i = chartDays - 1; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      chartMap[key] = { date: key, label: i < 7 ? dayNames[d.getDay()] : d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }), gmv: 0, fees: 0 };
    }
    (ordersData || [])
      .filter((o) => !["cancelled", "refunded", "pending"].includes(o.status))
      .forEach((o) => {
        const key = o.created_at.slice(0, 10);
        if (chartMap[key]) {
          chartMap[key].gmv   += o.total ?? 0;
          chartMap[key].fees  += Math.round((o.total ?? 0) * PLATFORM_FEE_RATE);
        }
      });
    const revenueChart = Object.values(chartMap);

    return NextResponse.json({
      summary: {
        gmv,
        platformFees,
        gatewayReceipts,
        totalRefunded,
        totalWalletBalances,
        walletCredits,
        walletDebits,
        feeRate: PLATFORM_FEE_RATE,
      },
      revenueChart,
      transactions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
