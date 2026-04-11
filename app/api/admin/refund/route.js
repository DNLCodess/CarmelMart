/**
 * POST /api/admin/refund
 *
 * Issues a wallet-credit refund for a given order.
 * Super admin only.
 *
 * Fixes applied:
 *   1. Double-refund guard — delegated to the refund_order_to_wallet() DB
 *      function which locks the orders row and raises ALREADY_REFUNDED.
 *   2. Atomic execution via refund_order_to_wallet() — wallet credit,
 *      wallet_transactions insert, and order status update all happen in
 *      one Postgres transaction (no partial failures).
 *   3. Rate limited: 20 refunds per hour per admin session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, retryAfterSeconds } from "@/lib/rateLimit";

export async function POST(request) {
  try {
    // ── Auth + role ───────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: me } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const rl = rateLimit(`refund:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many refund requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
        }
      );
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { order_id, customer_id, amount, reason } = await request.json();
    if (!order_id || !customer_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "order_id, customer_id, and amount > 0 are required" },
        { status: 400 }
      );
    }

    const reference = `CM-REF-${Date.now()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 7)
      .toUpperCase()}`;

    // ── Atomic refund via DB function ─────────────────────────────────────────
    // refund_order_to_wallet() handles the double-refund guard (ALREADY_REFUNDED),
    // credits the wallet, inserts the wallet_transactions record, and updates
    // orders.status — all in one Postgres transaction.
    const { error: rpcErr } = await admin.rpc("refund_order_to_wallet", {
      p_order_id:    order_id,
      p_customer_id: customer_id,
      p_amount:      amount,
      p_reason:      reason ?? "",
      p_reference:   reference,
    });

    if (rpcErr) {
      // Map Postgres exception messages to user-friendly errors
      const msg = rpcErr.message ?? "";

      if (msg.includes("ALREADY_REFUNDED")) {
        return NextResponse.json(
          { error: "This order has already been refunded." },
          { status: 409 }
        );
      }
      if (msg.includes("AMOUNT_EXCEEDS_TOTAL")) {
        return NextResponse.json(
          { error: "Refund amount exceeds the order total." },
          { status: 400 }
        );
      }
      if (msg.includes("CUSTOMER_MISMATCH")) {
        return NextResponse.json(
          { error: "Customer does not match this order." },
          { status: 400 }
        );
      }
      if (msg.includes("ORDER_NOT_FOUND")) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      throw rpcErr;
    }

    return NextResponse.json({ success: true, reference, new_status: "refunded" });
  } catch (error) {
    console.error("[POST /api/admin/refund]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
