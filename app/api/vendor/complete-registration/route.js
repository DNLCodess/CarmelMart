import { NextResponse } from "next/server";

const REFERRAL_BONUS = 500;
const VERIFICATION_FEE = 5000;

/**
 * API Route: POST /api/vendor/complete-registration
 * Verifies Flutterwave payment and completes vendor registration
 * Handles referral bonus if applicable
 */
export async function POST(request) {
  try {
    const { userId, transactionId, verificationData, referralCode } =
      await request.json();

    // Validate required fields
    if (!userId || !transactionId || !verificationData) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
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
    if (paymentVerified.amount < VERIFICATION_FEE) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount is insufficient",
        },
        { status: 400 }
      );
    }

    // Step 2: Generate unique referral code for new vendor
    const newReferralCode = await generateUniqueReferralCode(userId);

    // Step 3: Process referral bonus if applicable
    let referralBonusProcessed = null;
    if (referralCode) {
      referralBonusProcessed = await processReferralBonus(referralCode);
    }

    // Step 4: Complete vendor registration
    const vendorData = await completeVendorRegistration({
      userId,
      verificationData,
      referralCode: newReferralCode,
      transactionId,
      referredBy: referralCode || null,
      registrationDate: new Date().toISOString(),
      status: "active",
    });

    // Step 5: Send welcome email
    await sendWelcomeEmail({
      email: verificationData.email,
      name: verificationData.fullName,
      referralCode: newReferralCode,
    });

    return NextResponse.json({
      success: true,
      message: "Vendor registration completed successfully",
      data: {
        vendorId: vendorData.id,
        referralCode: newReferralCode,
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

/**
 * Generate unique referral code for vendor
 */
async function generateUniqueReferralCode(userId) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  // Generate 8-character code
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Add prefix for vendors
  const referralCode = `VND${code}`;

  // Check if code already exists in database
  // If it does, generate a new one recursively
  const exists = await checkReferralCodeExists(referralCode);
  if (exists) {
    return generateUniqueReferralCode(userId);
  }

  return referralCode;
}

/**
 * Check if referral code exists
 */
async function checkReferralCodeExists(code) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data } = await supabase
  //   .from('vendors')
  //   .select('id')
  //   .eq('referral_code', code)
  //   .single();
  // return !!data;

  return false; // For now, assume code doesn't exist
}

/**
 * Process referral bonus
 */
async function processReferralBonus(referralCode) {
  try {
    // Find the vendor who owns this referral code
    const referrer = await findVendorByReferralCode(referralCode);

    if (!referrer) {
      console.warn(`Referral code ${referralCode} not found`);
      return null;
    }

    // Update referrer's wallet balance
    const updatedBalance = await updateVendorWallet({
      vendorId: referrer.id,
      amount: REFERRAL_BONUS,
      type: "referral_bonus",
      description: `Referral bonus for new vendor signup`,
    });

    // Create referral record
    const referralRecord = await createReferralRecord({
      referrerId: referrer.id,
      referredUserId: null, // Will be set after registration
      bonusAmount: REFERRAL_BONUS,
      status: "completed",
      createdAt: new Date().toISOString(),
    });

    // Send notification to referrer
    await sendReferralBonusNotification({
      email: referrer.email,
      amount: REFERRAL_BONUS,
    });

    return {
      referrerId: referrer.id,
      bonusAmount: REFERRAL_BONUS,
      newBalance: updatedBalance,
    };
  } catch (error) {
    console.error("Referral Bonus Processing Error:", error);
    return null;
  }
}

/**
 * Find vendor by referral code
 */
async function findVendorByReferralCode(code) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('vendors')
  //   .select('*')
  //   .eq('referral_code', code)
  //   .single();

  // if (error) return null;
  // return data;

  // For now, return mock data
  return {
    id: "vendor_123",
    email: "[email protected]",
    referralCode: code,
  };
}

/**
 * Update vendor wallet balance
 */
async function updateVendorWallet({ vendorId, amount, type, description }) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data: vendor } = await supabase
  //   .from('vendors')
  //   .select('wallet_balance')
  //   .eq('id', vendorId)
  //   .single();

  // const newBalance = (vendor?.wallet_balance || 0) + amount;

  // await supabase
  //   .from('vendors')
  //   .update({ wallet_balance: newBalance })
  //   .eq('id', vendorId);

  // // Create transaction record
  // await supabase
  //   .from('wallet_transactions')
  //   .insert([{
  //     vendor_id: vendorId,
  //     amount: amount,
  //     type: type,
  //     description: description,
  //     created_at: new Date().toISOString(),
  //   }]);

  // return newBalance;

  return amount; // Mock new balance
}

/**
 * Create referral record
 */
async function createReferralRecord(data) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data: record, error } = await supabase
  //   .from('referrals')
  //   .insert([data])
  //   .select()
  //   .single();

  // if (error) throw error;
  // return record;

  return { ...data, id: `ref_${Date.now()}` };
}

/**
 * Complete vendor registration
 */
async function completeVendorRegistration(data) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data: vendor, error } = await supabase
  //   .from('vendors')
  //   .update({
  //     nin_number: data.verificationData.nin,
  //     cac_number: data.verificationData.cac,
  //     company_name: data.verificationData.companyName,
  //     referral_code: data.referralCode,
  //     referred_by: data.referredBy,
  //     verification_status: 'verified',
  //     payment_status: 'paid',
  //     transaction_id: data.transactionId,
  //     status: data.status,
  //     registration_completed_at: data.registrationDate,
  //   })
  //   .eq('user_id', data.userId)
  //   .select()
  //   .single();

  // if (error) throw error;
  // return vendor;

  return { id: `vendor_${Date.now()}`, ...data };
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail({ email, name, referralCode }) {
  // Implement your email sending logic here
  // Example using SendGrid, Resend, or other email service

  console.log(`Sending welcome email to ${email}`);
  // await emailService.send({
  //   to: email,
  //   subject: "Welcome to CarmelMart - Your Vendor Account is Active!",
  //   html: generateWelcomeEmailTemplate(name, referralCode),
  // });
}

/**
 * Send referral bonus notification
 */
async function sendReferralBonusNotification({ email, amount }) {
  // Implement your notification logic here
  console.log(`Sending referral bonus notification to ${email}`);
  // await emailService.send({
  //   to: email,
  //   subject: "You've earned a referral bonus!",
  //   html: `You've earned ₦${amount} from your referral!`,
  // });
}
