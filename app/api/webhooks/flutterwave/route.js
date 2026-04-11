/**
 * POST /api/webhooks/flutterwave
 *
 * Receives Flutterwave event notifications and executes the business
 * logic that the client-side callback may have missed (e.g. browser
 * crashed, network drop after payment).
 *
 * Security:
 *   - Validates the `verif-hash` header against FLUTTERWAVE_WEBHOOK_HASH
 *   - Every handler is idempotent — safe to receive the same event twice
 *   - Only the service-role admin client is used (no user session)
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeExpiryDate } from "@/lib/subscription";

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(signature) {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret) {
    console.error("[flw-webhook] FLUTTERWAVE_WEBHOOK_HASH env var not set — rejecting all webhooks");
    return false;
  }
  return signature === secret;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const rawBody  = await request.text();
    const signature = request.headers.get("verif-hash");

    if (!verifySignature(signature)) {
      console.warn("[flw-webhook] Invalid signature — request rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { event, data } = payload;

    // Always return 200 so Flutterwave doesn't retry endlessly.
    // Each handler swallows its own errors and logs them.
    switch (event) {
      case "charge.completed":
        await handleChargeCompleted(data);
        break;
      case "transfer.completed":
        await handleTransferCompleted(data);
        break;
      default:
        // Silently ignore unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[flw-webhook] Unhandled error:", error);
    // Still return 200 — a 500 would cause Flutterwave to retry
    return NextResponse.json({ received: true });
  }
}

// ── charge.completed ──────────────────────────────────────────────────────────

async function handleChargeCompleted(data) {
  const {
    id:     flwTransactionId,
    tx_ref,
    amount,
    currency,
    status,
    flw_ref,
  } = data;

  // Only process successful NGN charges
  if (status !== "successful") return;
  if (currency !== "NGN") {
    console.warn(`[flw-webhook] Non-NGN charge ignored (${currency}) for tx_ref=${tx_ref}`);
    return;
  }

  const admin = createAdminClient();

  // Look up the pending payment record by reference (tx_ref)
  const { data: payment, error: lookupErr } = await admin
    .from("payments")
    .select("id, user_id, amount, status, type, verification_type, reference")
    .eq("reference", tx_ref)
    .maybeSingle();

  if (lookupErr) {
    console.error(`[flw-webhook] payments lookup error for tx_ref=${tx_ref}:`, lookupErr);
    return;
  }

  if (!payment) {
    // Could be an older vendor-registration payment that pre-dates the payments table.
    // Nothing to do — the client-side complete-registration route handles those.
    return;
  }

  // Idempotency guard — already processed
  if (payment.status === "success") {
    return;
  }

  // Amount integrity — reject if Flutterwave amount is less than what we recorded
  if (Number(amount) < Number(payment.amount)) {
    console.error(
      `[flw-webhook] Amount mismatch for tx_ref=${tx_ref}: ` +
      `expected ${payment.amount}, got ${amount}`
    );
    return;
  }

  // Dispatch by payment type
  switch (payment.type) {
    case "subscription":
      await activateSubscription({ payment, flwTransactionId, tx_ref, flw_ref, admin });
      break;

    case "vendor_fee":
      await completeVendorRegistration({ payment, flwTransactionId, tx_ref, admin });
      break;

    default:
      console.warn(`[flw-webhook] Unhandled payment type="${payment.type}" for tx_ref=${tx_ref}`);
  }
}

// ── Subscription activation ───────────────────────────────────────────────────

async function activateSubscription({ payment, flwTransactionId, tx_ref, flw_ref, admin }) {
  try {
    // verification_type is stored as "premium_monthly" or "vip_annual" etc.
    const parts = (payment.verification_type ?? "").split("_");
    // tier = parts[0], billing_cycle = everything after (handles "vip_annual")
    const tier          = parts[0];
    const billing_cycle = parts.slice(1).join("_") || "monthly";

    if (!["premium", "vip"].includes(tier)) {
      console.error(`[flw-webhook] Unknown tier "${tier}" for tx_ref=${tx_ref}`);
      return;
    }

    const expiresAt = computeExpiryDate(billing_cycle, new Date());

    // Use the atomic DB function — this is the same function called by the
    // client-side subscription/verify route, so duplicate webhook calls are
    // harmless (the UPDATE WHERE status='pending' guard makes it idempotent).
    const { error: rpcErr } = await admin.rpc("activate_vendor_subscription", {
      p_vendor_id:     payment.user_id,
      p_tier:          tier,
      p_billing_cycle: billing_cycle,
      p_amount:        Number(payment.amount),
      p_expires_at:    expiresAt.toISOString(),
      p_flw_tx_ref:    tx_ref,
      p_flw_tx_id:     String(flwTransactionId),
      p_flw_ref:       flw_ref ?? null,
      p_payment_ref:   payment.reference,
    });

    if (rpcErr) {
      console.error(`[flw-webhook] activate_vendor_subscription RPC error for tx_ref=${tx_ref}:`, rpcErr);
    }
  } catch (err) {
    console.error(`[flw-webhook] activateSubscription error for tx_ref=${tx_ref}:`, err);
  }
}

// ── Vendor registration completion ────────────────────────────────────────────

async function completeVendorRegistration({ payment, flwTransactionId, tx_ref, admin }) {
  try {
    // Mark payment as success
    await admin
      .from("payments")
      .update({
        status:         "success",
        transaction_id: String(flwTransactionId),
        updated_at:     new Date().toISOString(),
      })
      .eq("reference", tx_ref)
      .eq("status", "pending"); // idempotency guard

    // Complete vendor registration — mark payment_verified and set status active
    const { error: vendorErr } = await admin
      .from("vendors")
      .update({
        payment_verified: true,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", payment.user_id);

    if (vendorErr) {
      console.error(`[flw-webhook] vendor update error for tx_ref=${tx_ref}:`, vendorErr);
      return;
    }

    // Process referral bonus if there is a pending referral for this user
    try {
      const { data: referral } = await admin
        .from("referrals")
        .select("id, referrer_id")
        .eq("referred_id", payment.user_id)
        .eq("status", "pending")
        .maybeSingle();

      if (referral) {
        await admin
          .from("referrals")
          .update({ status: "completed" })
          .eq("id", referral.id);

        // ₦500 referral bonus — matches the constant in complete-registration
        await admin.rpc("credit_wallet", {
          user_id:     referral.referrer_id,
          amount:      500,
          description: "Referral bonus — new vendor verified",
        });
      }
    } catch (refErr) {
      // Referral bonus is non-critical — log and continue
      console.error(`[flw-webhook] Referral bonus error for user=${payment.user_id}:`, refErr);
    }
  } catch (err) {
    console.error(`[flw-webhook] completeVendorRegistration error for tx_ref=${tx_ref}:`, err);
  }
}

// ── transfer.completed ────────────────────────────────────────────────────────

async function handleTransferCompleted(data) {
  /**
   * Flutterwave sends transfer.completed for both successful and failed transfers.
   * The `data.status` field will be "SUCCESSFUL" or "FAILED".
   * We update vendor_payouts to reflect the final state so the UI stays accurate.
   */
  const { reference, status } = data;

  if (!reference) {
    console.warn("[flw-webhook] transfer.completed event missing reference — skipping");
    return;
  }

  const admin        = createAdminClient();
  const finalStatus  = status === "SUCCESSFUL" ? "completed" : "failed";
  const errorMessage = status !== "SUCCESSFUL" ? (data.complete_message ?? "Transfer failed") : null;

  try {
    const { error } = await admin
      .from("vendor_payouts")
      .update({
        status:     finalStatus,
        ...(errorMessage && { error: errorMessage }),
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    if (error) {
      console.error(`[flw-webhook] vendor_payouts update error for ref=${reference}:`, error);
    }
  } catch (err) {
    console.error(`[flw-webhook] handleTransferCompleted error for ref=${reference}:`, err);
  }
}

// ── GET — liveness probe ──────────────────────────────────────────────────────
// Returns 200 without leaking any internal info.
export async function GET() {
  return NextResponse.json({ ok: true });
}
