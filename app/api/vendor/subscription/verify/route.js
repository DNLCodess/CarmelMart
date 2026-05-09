/**
 * POST /api/vendor/subscription/verify
 *
 * Verifies a Flutterwave subscription payment and activates the plan.
 *
 * Security / reliability:
 *   1. Amount compared against the stored pending payment record (not re-fetched
 *      from platform_settings) — immune to mid-checkout price changes.
 *   2. Currency check — only NGN payments accepted.
 *   3. 10-second timeout on the upstream Flutterwave call.
 *   4. Atomic DB update via activate_vendor_subscription() RPC.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, computeExpiryDate } from "@/lib/subscription";

const FLW_TIMEOUT_MS = 10_000;

export async function POST(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { transaction_id, reference, flw_ref, tier, billing_cycle = "monthly" } = body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!transaction_id || !reference || !tier) {
      return NextResponse.json(
        { error: "transaction_id, reference, and tier are required." },
        { status: 400 }
      );
    }
    if (!["premium", "vip"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }
    if (!["monthly", "annual"].includes(billing_cycle)) {
      return NextResponse.json({ error: "Invalid billing_cycle." }, { status: 400 });
    }

    // ── Replay-attack guard ───────────────────────────────────────────────────
    // Reference must exist, belong to THIS user, and still be pending.
    const { data: pendingPayment, error: paymentLookupError } = await admin
      .from("payments")
      .select("id, status, amount")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (paymentLookupError || !pendingPayment) {
      return NextResponse.json({ error: "Payment reference not found." }, { status: 400 });
    }
    if (pendingPayment.status === "success") {
      return NextResponse.json(
        { error: "This payment has already been processed." },
        { status: 400 }
      );
    }

    // ── Flutterwave verification (with timeout) ────────────────────────────────
    let fwData;
    try {
      const fwRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction_id)}/verify`,
        {
          method:  "GET",
          headers: {
            Authorization:  `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(FLW_TIMEOUT_MS),
        }
      );
      fwData = await fwRes.json();
    } catch (fetchErr) {
      const isTimeout = fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError";
      return NextResponse.json(
        {
          error: isTimeout
            ? "Payment provider timed out. Please try again."
            : "Failed to reach payment provider.",
        },
        { status: 502 }
      );
    }

    if (fwData.status !== "success" || fwData.data?.status !== "successful") {
      return NextResponse.json(
        { error: "Payment was not successful. Please contact support if funds were debited." },
        { status: 400 }
      );
    }

    // ── Currency check ────────────────────────────────────────────────────────
    if (fwData.data.currency !== "NGN") {
      return NextResponse.json(
        { error: `Invalid payment currency: ${fwData.data.currency}. Only NGN payments are accepted.` },
        { status: 400 }
      );
    }

    // ── Amount integrity check ────────────────────────────────────────────────
    // Compare against the stored pending amount (set at upgrade initiation),
    // not the current platform_settings value — price changes mid-checkout
    // should not affect a payment already in flight.
    const expectedAmount = Number(pendingPayment.amount);
    const paidAmount     = Number(fwData.data.amount);
    if (paidAmount < expectedAmount) {
      return NextResponse.json(
        {
          error: `Payment amount mismatch. Expected ₦${expectedAmount.toLocaleString()}, received ₦${paidAmount.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    // ── Atomic activation via DB function ─────────────────────────────────────
    const expiresAt = computeExpiryDate(billing_cycle, new Date());

    const { data: newSubId, error: rpcError } = await admin.rpc(
      "activate_vendor_subscription",
      {
        p_vendor_id:     user.id,
        p_tier:          tier,
        p_billing_cycle: billing_cycle,
        p_amount:        paidAmount,
        p_expires_at:    expiresAt.toISOString(),
        p_flw_tx_ref:    fwData.data.tx_ref  ?? null,
        p_flw_tx_id:     String(transaction_id),
        p_flw_ref:       fwData.data.flw_ref ?? flw_ref ?? null,
        p_payment_ref:   reference,
      }
    );

    if (rpcError) {
      console.error("[subscription/verify] activate_vendor_subscription RPC error:", rpcError);
      throw rpcError;
    }

    const { data: newSub } = await admin
      .from("vendor_subscriptions")
      .select("*")
      .eq("id", newSubId)
      .single();

    const plan = getPlan(tier);

    return NextResponse.json({ success: true, tier, plan, subscription: newSub });
  } catch (error) {
    console.error("[POST /api/vendor/subscription/verify]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
