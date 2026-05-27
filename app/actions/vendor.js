"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server action: complete vendor registration after successful payment.
 * Verifies the Flutterwave transaction server-side, activates the vendor,
 * marks the user as verified, and credits any pending referral bonus.
 *
 * Called from VendorVerification after the Flutterwave callback fires.
 */
export async function completeVendorPaymentAction({ transactionId, reference, flwRef }) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");
  const userId = user.id;

  const admin = createAdminClient();

  // 1. Fetch the pending payment record to get the expected amount
  const { data: pendingPayment } = await admin
    .from("payments")
    .select("amount, status")
    .eq("reference", reference)
    .eq("user_id", userId)
    .single();

  if (!pendingPayment) throw new Error("Payment record not found. Please contact support.");
  if (pendingPayment.status === "success") throw new Error("Payment already processed.");

  // 2. Verify payment with Flutterwave server-side
  const fwRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const fwData = await fwRes.json();

  if (fwData.status !== "success" || fwData.data?.status !== "successful") {
    throw new Error("Payment verification failed. Please contact support.");
  }

  // 3. Amount + currency integrity check — prevents any successful Flutterwave tx from activating vendor
  const paidAmount   = Number(fwData.data?.amount ?? 0);
  const paidCurrency = fwData.data?.currency;
  const expectedAmount = Number(pendingPayment.amount);

  if (paidCurrency !== "NGN") {
    throw new Error("Invalid payment currency. Please contact support.");
  }
  if (paidAmount < expectedAmount) {
    throw new Error(`Insufficient payment amount. Expected ₦${expectedAmount.toLocaleString()}, received ₦${paidAmount.toLocaleString()}.`);
  }

  // 4. Mark payment record as successful — use admin client to bypass RLS
  await admin
    .from("payments")
    .update({
      status: "success",
      transaction_id: transactionId,
      flw_ref: flwRef,
    })
    .eq("reference", reference);

  // 5. Record payment as complete — admin approval sets verification_status to "verified"
  const { error: vendorError } = await admin
    .from("vendors")
    .update({ payment_verified: true })
    .eq("id", userId);

  if (vendorError) throw new Error("Failed to activate vendor account.");

  // 7. Credit referral bonus if a pending referral exists
  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .single();

    if (referral) {
      await admin
        .from("referrals")
        .update({ status: "completed" })
        .eq("id", referral.id);

      await admin.rpc("increment_wallet", {
        p_user_id: referral.referrer_id,
        p_amount:  500,
      });

      await admin.from("wallet_transactions").insert({
        user_id:     referral.referrer_id,
        type:        "credit",
        amount:      500,
        description: "Referral bonus — new vendor verified",
        created_at:  new Date().toISOString(),
      });
    }
  } catch {
    // Non-fatal — don't block vendor activation over referral crediting
  }

  return { success: true };
}
