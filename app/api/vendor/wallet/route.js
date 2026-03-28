import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role, wallet_balance").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Wallet transactions
    const { data: txns } = await admin
      .from("wallet_transactions")
      .select("id, type, amount, description, reference, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const transactions = (txns || []).map((t) => ({
      id:          t.id,
      type:        t.type,
      amount:      t.amount,
      description: t.description,
      reference:   t.reference,
      date:        new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    }));

    // Pending payout: orders delivered but not yet settled to wallet
    // (order_items where vendor_id = user.id AND order status = delivered AND no payout record)
    const { data: pendingPayoutData } = await admin
      .from("order_items")
      .select("total, orders!inner(status)")
      .eq("vendor_id", user.id)
      .eq("orders.status", "delivered");

    // Sum delivered items — this is revenue awaiting settlement
    const pendingPayout = (pendingPayoutData || []).reduce((sum, r) => sum + (r.total ?? 0), 0);

    // Total earned (all time)
    const totalEarned = transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);

    // Next payout date — every Friday
    const today        = new Date();
    const dayOfWeek    = today.getDay(); // 0=Sun, 5=Fri
    const daysToFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
    const nextFriday   = new Date(today);
    nextFriday.setDate(today.getDate() + (daysToFriday === 0 ? 7 : daysToFriday));
    const nextPayoutDate = nextFriday.toLocaleDateString("en-NG", {
      weekday: "short", day: "numeric", month: "short",
    });

    return NextResponse.json({
      balance:         profile.wallet_balance ?? 0,
      pending_payout:  pendingPayout,
      total_earned:    totalEarned,
      next_payout_date: nextPayoutDate,
      transactions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
