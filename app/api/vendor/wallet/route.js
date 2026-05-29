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

    // Wallet transactions (recent 20 for display)
    const [txnsResult, totalEarnedResult, pendingPayoutResult] = await Promise.all([
      admin
        .from("wallet_transactions")
        .select("id, type, amount, description, reference, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      // Total earned: sum of all credits across all time (not limited to 20)
      admin
        .from("wallet_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "credit"),
      // Pending payout: paid delivered orders not yet settled
      admin
        .from("order_items")
        .select("total, orders!inner(status, payment_status)")
        .eq("vendor_id", user.id)
        .eq("orders.status", "delivered")
        .eq("orders.payment_status", "paid"),
    ]);

    const transactions = (txnsResult.data || []).map((t) => ({
      id:          t.id,
      type:        t.type,
      amount:      t.amount,
      description: t.description,
      reference:   t.reference,
      date:        new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    }));

    const totalEarned  = (totalEarnedResult.data || []).reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const pendingPayout = (pendingPayoutResult.data || []).reduce((sum, r) => sum + (r.total ?? 0), 0);

    return NextResponse.json({
      balance:        profile.wallet_balance ?? 0,
      pending_payout: pendingPayout,
      total_earned:   totalEarned,
      transactions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
