"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { authEmailTemplates } from "@/lib/email/auth";

// ─── Shared auth helper ───────────────────────────────────────────────────────
async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

// ─── KYC step actions ─────────────────────────────────────────────────────────

/** Step 1 — persist business + bank details */
export async function saveVendorBusinessDetailsAction({
  businessName,
  address,
  phone,
  accountNumber,
  bankName,
  bankCode,
}) {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({
      business_name:       businessName,
      address,
      phone,
      bank_account_number: accountNumber,
      bank_name:           bankName,
      bank_code:           bankCode,
      updated_at:          new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error("Failed to save business details");
}

/** Step 2 — persist chosen verification tier */
export async function setVendorTierAction(type) {
  if (!["nin", "nin_cac"].includes(type)) throw new Error("Invalid tier");
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({ verification_type: type })
    .eq("id", userId);
  if (error) throw new Error("Failed to save tier selection");
}

/** Payment step — create a pending payment record before opening Flutterwave */
export async function createVendorPaymentRecordAction({ reference, amount, verificationType }) {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert([{
    user_id:           userId,
    amount,
    reference,
    status:            "pending",
    type:              "vendor_fee",
    payment_provider:  "flutterwave",
    verification_type: verificationType,
  }]);
  if (error) throw new Error("Failed to create payment record");
}

/** Update payment status on cancel or processing error */
export async function updateVendorPaymentStatusAction(reference, status, errorMessage = null) {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();
  const update = { status };
  if (errorMessage) update.error_message = errorMessage;
  await admin.from("payments").update(update).eq("reference", reference).eq("user_id", userId);
}

/**
 * Server action: complete vendor registration after successful payment.
 * Verifies the Flutterwave transaction server-side, activates the vendor,
 * marks the user as verified, and credits any pending referral bonus.
 *
 * Called from VendorVerification after the Flutterwave callback fires.
 */
export async function completeVendorPaymentAction({ transactionId, reference, flwRef }) {
  const userId = await getAuthenticatedUserId();
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

  // 3. Amount + currency integrity check
  const paidAmount     = Number(fwData.data?.amount ?? 0);
  const paidCurrency   = fwData.data?.currency;
  const expectedAmount = Number(pendingPayment.amount);

  if (paidCurrency !== "NGN") {
    throw new Error("Invalid payment currency. Please contact support.");
  }
  if (paidAmount < expectedAmount) {
    throw new Error(`Insufficient payment amount. Expected ₦${expectedAmount.toLocaleString()}, received ₦${paidAmount.toLocaleString()}.`);
  }

  // 4. Mark payment as successful
  await admin
    .from("payments")
    .update({ status: "success", transaction_id: transactionId, flw_ref: flwRef })
    .eq("reference", reference);

  // 5. Activate vendor
  const { error: vendorError } = await admin
    .from("vendors")
    .update({ payment_verified: true })
    .eq("id", userId);

  if (vendorError) throw new Error("Failed to activate vendor account.");

  // 6. Credit referral bonus if applicable
  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .single();

    if (referral) {
      await admin.from("referrals").update({ status: "completed" }).eq("id", referral.id);
      await admin.rpc("increment_wallet", { p_user_id: referral.referrer_id, p_amount: 500 });
      await admin.from("wallet_transactions").insert({
        user_id:     referral.referrer_id,
        type:        "credit",
        amount:      500,
        description: "Referral bonus — new vendor verified",
        created_at:  new Date().toISOString(),
      });
    }
  } catch {
    // Non-fatal
  }

  // 7. Send vendor activation / welcome email
  try {
    const { data: profile } = await admin
      .from("users")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (profile?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const name   = profile.first_name ?? profile.email.split("@")[0];

      // Reuse the signup template body — subject makes the intent clear
      const BASE_URL    = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const template    = authEmailTemplates.vendor_activated({
        name,
        dashboardUrl: `${BASE_URL}/vendor/dashboard`,
      });

      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL,
        to:      profile.email,
        subject: template.subject,
        html:    template.html,
      });
    }
  } catch (err) {
    console.error("[completeVendorPaymentAction] Welcome email failed:", err?.message);
    // Non-fatal
  }

  return { success: true };
}
