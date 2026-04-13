"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateReferralCode } from "@/lib/utils";

/**
 * Sign in with email + password.
 * Session is stored in HttpOnly cookies by @supabase/ssr — not in localStorage or Zustand.
 * Returns { error } for expected failures (wrong credentials, unverified email).
 * Only throws for unexpected server errors.
 */
export async function loginAction({ email, password }) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Create a new account (customer or vendor).
 * Rolls back the auth.users record if profile insert fails,
 * so the email doesn't get permanently locked.
 *
 * Returns { userId, role, requiresEmailVerification } for the client to handle routing.
 */
export async function signupAction({
  email,
  password,
  phone,
  role = "customer",
  referralCode,
}) {
  if (!email || !password || !phone) {
    return { error: "Email, password, and phone number are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { role } },
  });

  if (error) return { error: error.message };
  if (!data?.user) return { error: "Failed to create account. Please try again." };

  const userId = data.user.id;
  const newReferralCode = generateReferralCode();

  // Insert user profile
  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    role,
    referral_code: newReferralCode,
    referred_by: referralCode?.trim().toUpperCase() || null,
    wallet_balance: 0,
  });

  if (profileError) {
    // Rollback: delete the orphaned auth user so the email is not permanently locked.
    await admin.auth.admin.deleteUser(userId);
    return { error: "Failed to complete registration. Please try again." };
  }

  // If vendor, create the vendor record shell (pending verification)
  if (role === "vendor") {
    await supabase.from("vendors").insert({
      id: userId,
      verification_status: "pending",
      nin_verified: false,
      cac_verified: false,
    });
    // Note: vendor profile errors are non-fatal; verification handles completion
  }

  // Record referral relationship (non-fatal if it fails)
  if (referralCode) {
    try {
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", referralCode.trim().toUpperCase())
        .single();

      if (referrer) {
        await supabase.from("referrals").insert({
          referrer_id: referrer.id,
          referred_id: userId,
          referral_code: referralCode.trim().toUpperCase(),
          bonus_amount: 500,
          status: "pending",
        });
      }
    } catch {
      // Non-fatal — don't block registration over referral issues
    }
  }

  revalidatePath("/", "layout");

  return {
    error: null,
    userId,
    role,
    requiresEmailVerification: !data.session, // true when email confirmation is on
  };
}

/**
 * Sign out current user. Clears HttpOnly session cookies.
 */
export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Update user profile fields.
 * Strips role and email — those fields cannot be changed via this action.
 */
export async function updateProfileAction(userId, data) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Not authenticated." };
  if (user.id !== userId) return { error: "Unauthorized." };

  // Strip sensitive fields — role and email cannot be changed via profile update
  const { role: _role, email: _email, referral_code: _ref, wallet_balance: _bal, ...safeData } = data;

  const { error } = await supabase.from("users").update(safeData).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { error: null };
}

/**
 * Update password for the currently authenticated user.
 */
export async function updatePasswordAction({ currentPassword, newPassword }) {
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Not authenticated." };

  // Re-authenticate to verify current password before changing
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { error: null };
}
