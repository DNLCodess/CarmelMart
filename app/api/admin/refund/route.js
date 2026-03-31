import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: me } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { order_id, customer_id, amount, reason } = await request.json();
    if (!order_id || !customer_id || !amount || amount <= 0)
      return NextResponse.json({ error: "order_id, customer_id, and amount > 0 are required" }, { status: 400 });

    // Verify order exists and belongs to customer
    const { data: order } = await admin
      .from("orders")
      .select("id, status, total, customer_id")
      .eq("id", order_id)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.customer_id !== customer_id)
      return NextResponse.json({ error: "Customer does not match order" }, { status: 400 });
    if (amount > order.total)
      return NextResponse.json({ error: `Refund (₦${amount.toLocaleString()}) exceeds order total (₦${order.total.toLocaleString()})` }, { status: 400 });

    const reference = `CM-REF-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase()}`;

    // Credit wallet
    const { error: walletErr } = await admin.rpc("increment_wallet", {
      p_user_id: customer_id,
      p_amount:  amount,
    }).catch(() => ({ error: null })); // fallback to manual update if RPC doesn't exist

    if (walletErr) {
      // Manual wallet update
      const { data: currentUser } = await admin.from("users").select("wallet_balance").eq("id", customer_id).single();
      await admin.from("users").update({ wallet_balance: (currentUser?.wallet_balance ?? 0) + amount }).eq("id", customer_id);
    }

    // Insert wallet transaction record
    await admin.from("wallet_transactions").insert({
      user_id:     customer_id,
      type:        "credit",
      amount,
      description: `Admin refund${reason ? `: ${reason}` : ""} — Order ${order_id.slice(0, 8).toUpperCase()}`,
      reference,
    });

    // Update order status to refunded
    await admin.from("orders").update({ status: "refunded" }).eq("id", order_id);

    return NextResponse.json({ success: true, reference, new_status: "refunded" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
