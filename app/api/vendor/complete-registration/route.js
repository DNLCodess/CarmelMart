import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const REFERRAL_BONUS = 500;
const MIN_VERIFICATION_FEE = 5000; // Standard tier; Premium (₦10,000) also passes this check

/**
 * API Route: POST /api/vendor/complete-registration
 * Verifies Flutterwave payment and completes vendor registration
 * Handles referral bonus if applicable
 */
export async function POST(request) {
  try {
    // Authenticate via session — never trust userId from the request body
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: "transactionId is required" },
        { status: 400 }
      );
    }

    // Step 1: Verify payment with Flutterwave
    const paymentVerified = await verifyFlutterwavePayment(transactionId);

    if (!paymentVerified.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment verification failed",
        },
        { status: 400 }
      );
    }

    // Check if payment amount matches
    if (paymentVerified.amount < MIN_VERIFICATION_FEE) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount is insufficient",
        },
        { status: 400 }
      );
    }

    // Step 2: Process referral bonus if applicable
    const referralBonusProcessed = await processReferralBonus(userId);

    // Step 3: Complete vendor registration
    const vendorData = await completeVendorRegistration({
      userId,
      transactionId,
      registrationDate: new Date().toISOString(),
      status: "active",
    });

    return NextResponse.json({
      success: true,
      message: "Vendor registration completed successfully",
      data: {
        vendorId: vendorData.id,
        referralBonusProcessed: !!referralBonusProcessed,
        dashboardUrl: "/vendor/dashboard",
      },
    });
  } catch (error) {
    console.error("Registration Completion Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred during registration completion",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Verify Flutterwave payment
 */
async function verifyFlutterwavePayment(transactionId) {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.status === "success" && data.data.status === "successful") {
      return {
        success: true,
        amount: data.data.amount,
        currency: data.data.currency,
        customer: data.data.customer,
        transactionRef: data.data.tx_ref,
      };
    }

    return { success: false };
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return { success: false };
  }
}

async function processReferralBonus(userId) {
  const supabase = createAdminClient();
  try {
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .single();

    if (!referral) return null;

    await supabase
      .from("referrals")
      .update({ status: "completed" })
      .eq("id", referral.id);

    await supabase.rpc("credit_wallet", {
      user_id: referral.referrer_id,
      amount: REFERRAL_BONUS,
      description: "Referral bonus — new vendor verified",
    });

    return { referrerId: referral.referrer_id, bonusAmount: REFERRAL_BONUS };
  } catch (error) {
    console.error("Referral Bonus Processing Error:", error);
    return null;
  }
}

async function completeVendorRegistration(data) {
  const supabase = createAdminClient();
  const { data: vendor, error } = await supabase
    .from("vendors")
    .update({
      payment_verified: true,
      transaction_id: data.transactionId,
      status: data.status,
      registration_completed_at: data.registrationDate,
    })
    .eq("id", data.userId)
    .select()
    .single();

  if (error) throw error;
  return vendor;
}
