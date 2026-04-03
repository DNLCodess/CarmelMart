"use server";

import { createClient } from "@/lib/supabase/server";

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

  // 1. Verify payment with Flutterwave server-side
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

  // 2. Mark payment record as successful
  await supabase
    .from("payments")
    .update({
      status: "success",
      transaction_id: transactionId,
      flw_ref: flwRef,
    })
    .eq("reference", reference);

  // 3. Activate vendor — this is the critical write that must NOT happen from the client
  const { error: vendorError } = await supabase
    .from("vendors")
    .update({ payment_verified: true, status: "active" })
    .eq("id", userId);

  if (vendorError) throw new Error("Failed to activate vendor account.");

  // 4. Mark user as verified
  await supabase
    .from("users")
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  // 5. Credit referral bonus if a pending referral exists
  try {
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .single();

    if (referral) {
      await supabase
        .from("referrals")
        .update({ status: "completed" })
        .eq("id", referral.id);

      await supabase.rpc("credit_wallet", {
        user_id: referral.referrer_id,
        amount: 500,
        description: "Referral bonus — new vendor verified",
      });
    }
  } catch {
    // Non-fatal — don't block vendor activation over referral crediting
  }

  return { success: true };
}
