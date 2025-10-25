import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * API Route: POST /api/webhooks/flutterwave
 * Handles Flutterwave webhook notifications for payment events
 *
 * This is critical for production as it provides server-side confirmation
 * of successful payments, even if the user closes the browser.
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("verif-hash");

    // Verify webhook signature for security
    if (!verifyWebhookSignature(body, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const data = payload.data;

    // Handle different event types
    switch (event) {
      case "charge.completed":
        await handlePaymentCompleted(data);
        break;

      case "charge.failed":
        await handlePaymentFailed(data);
        break;

      case "transfer.completed":
        await handleTransferCompleted(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(body, signature) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

  if (!secretHash) {
    console.error("FLUTTERWAVE_SECRET_HASH not set");
    return false;
  }

  // For Flutterwave, the signature is the secret hash itself
  return signature === secretHash;
}

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(data) {
  try {
    const { id, tx_ref, amount, currency, customer, status } = data;

    // Only process successful payments
    if (status !== "successful") {
      console.log(`Payment ${id} is not successful: ${status}`);
      return;
    }

    // Check if this payment was already processed
    const alreadyProcessed = await checkPaymentProcessed(id);
    if (alreadyProcessed) {
      console.log(`Payment ${id} already processed`);
      return;
    }

    // Extract user ID from transaction reference
    // Format: VENDOR_{userId}_{timestamp}
    const userId = extractUserIdFromTxRef(tx_ref);

    if (!userId) {
      console.error(`Could not extract user ID from tx_ref: ${tx_ref}`);
      return;
    }

    // Get verification data from pending registrations
    const verificationData = await getPendingVerification(userId);

    if (!verificationData) {
      console.error(`No pending verification found for user: ${userId}`);
      return;
    }

    // Generate referral code
    const referralCode = await generateUniqueReferralCode(userId);

    // Process referral bonus if applicable
    let referralBonus = null;
    if (verificationData.referralCode) {
      referralBonus = await processReferralBonus(
        verificationData.referralCode,
        amount * 0.1 // 10% of payment as bonus
      );
    }

    // Complete vendor registration
    await completeVendorRegistration({
      userId,
      transactionId: id,
      amount,
      currency,
      verificationData,
      referralCode,
      referralBonus,
    });

    // Mark payment as processed
    await markPaymentProcessed(id);

    // Send confirmation email
    await sendPaymentConfirmationEmail({
      email: customer.email,
      name: customer.name,
      amount,
      transactionId: id,
    });

    console.log(`Successfully processed payment ${id} for user ${userId}`);
  } catch (error) {
    console.error("Error handling payment completion:", error);
    // Don't throw - we want to return 200 to Flutterwave even if processing fails
    // We can retry later based on the processed status
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data) {
  try {
    const { id, tx_ref, customer } = data;

    const userId = extractUserIdFromTxRef(tx_ref);

    // Update registration status
    await updateRegistrationStatus(userId, "payment_failed");

    // Send notification
    await sendPaymentFailedEmail({
      email: customer.email,
      name: customer.name,
      transactionId: id,
    });

    console.log(`Payment failed for user ${userId}: ${id}`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

/**
 * Handle completed transfer (for payouts)
 */
async function handleTransferCompleted(data) {
  try {
    // Implement transfer completion logic if you have vendor payouts
    console.log("Transfer completed:", data);
  } catch (error) {
    console.error("Error handling transfer completion:", error);
  }
}

/**
 * Extract user ID from transaction reference
 */
function extractUserIdFromTxRef(txRef) {
  // Format: VENDOR_{userId}_{timestamp}
  const match = txRef.match(/^VENDOR_([^_]+)_\d+$/);
  return match ? match[1] : null;
}

/**
 * Check if payment was already processed
 */
async function checkPaymentProcessed(transactionId) {
  // Check your database for this transaction
  // Example using Supabase:
  // const { data } = await supabase
  //   .from('processed_payments')
  //   .select('id')
  //   .eq('transaction_id', transactionId)
  //   .single();

  // return !!data;

  return false; // Mock - implement with your database
}

/**
 * Mark payment as processed
 */
async function markPaymentProcessed(transactionId) {
  // Store in database to prevent duplicate processing
  // Example using Supabase:
  // await supabase
  //   .from('processed_payments')
  //   .insert([{
  //     transaction_id: transactionId,
  //     processed_at: new Date().toISOString(),
  //   }]);

  console.log(`Marked payment ${transactionId} as processed`);
}

/**
 * Get pending verification data
 */
async function getPendingVerification(userId) {
  // Fetch from your database
  // Example using Supabase:
  // const { data } = await supabase
  //   .from('pending_verifications')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .single();

  // return data;

  return null; // Mock - implement with your database
}

/**
 * Update registration status
 */
async function updateRegistrationStatus(userId, status) {
  // Update in your database
  // Example using Supabase:
  // await supabase
  //   .from('vendors')
  //   .update({ status: status })
  //   .eq('user_id', userId);

  console.log(`Updated registration status for ${userId}: ${status}`);
}

/**
 * Generate unique referral code
 */
async function generateUniqueReferralCode(userId) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return `VND${code}`;
}

/**
 * Process referral bonus
 */
async function processReferralBonus(referralCode, bonusAmount) {
  // Implement referral bonus logic
  console.log(
    `Processing referral bonus for code ${referralCode}: ${bonusAmount}`
  );
  return { referralCode, bonusAmount };
}

/**
 * Complete vendor registration
 */
async function completeVendorRegistration(data) {
  // Complete the registration in your database
  console.log("Completing vendor registration:", data);
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(data) {
  // Send email using your email service
  console.log("Sending payment confirmation email:", data);
}

/**
 * Send payment failed email
 */
async function sendPaymentFailedEmail(data) {
  // Send email using your email service
  console.log("Sending payment failed email:", data);
}

/**
 * GET handler - for webhook verification
 */
export async function GET(request) {
  return NextResponse.json({
    message: "Flutterwave webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
