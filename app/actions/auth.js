"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateReferralCode } from "@/lib/utils";

// ─── Login rate limiter ───────────────────────────────────────────────────────
// Per-email, in-memory. Works for single-instance; swap Map for Redis in multi-node.
const _loginAttempts = new Map(); // normalizedEmail → { count, resetAt }
const RATE_MAX    = 5;
const RATE_WINDOW = 15 * 60 * 1000; // 15 min

function _checkRate(email) {
  const now    = Date.now();
  const record = _loginAttempts.get(email);
  if (!record || now > record.resetAt) {
    _loginAttempts.set(email, { count: 1, resetAt: now + RATE_WINDOW });
    return { limited: false };
  }
  if (record.count >= RATE_MAX) {
    const mins = Math.ceil((record.resetAt - now) / 60_000);
    return { limited: true, retryAfter: mins };
  }
  record.count++;
  return { limited: false };
}

function _clearRate(email) {
  _loginAttempts.delete(email);
}

// Nigerian phone: starts with +234 or 0, then 7/8/9, then 0/1, then 8 more digits
const NIGERIAN_PHONE_RE = /^(\+234|0)[789][01]\d{8}$/;

/**
 * Sign in with email + password.
 * Session is stored in HttpOnly cookies by @supabase/ssr — not in localStorage or Zustand.
 * Returns { error } for expected failures (wrong credentials, unverified email).
 * Only throws for unexpected server errors.
 */
export async function loginAction({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const rateCheck = _checkRate(normalizedEmail);
  if (rateCheck.limited) {
    return {
      error: `Too many login attempts. Please try again in ${rateCheck.retryAfter} minute${rateCheck.retryAfter === 1 ? "" : "s"}.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    // Return a generic message — never distinguish between "wrong password" and
    // "email not found / not confirmed" to prevent account enumeration.
    return { error: "Invalid email or password." };
  }

  _clearRate(normalizedEmail);
  return { error: null };
}

/**
 * Create a new account (customer or vendor).
 * Rolls back the auth.users record if any required profile insert fails,
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
  captchaToken = null,
}) {
  if (!email || !password || !phone) {
    return { error: "Email, password, and phone number are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!NIGERIAN_PHONE_RE.test(phone.trim())) {
    return { error: "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { role },
      ...(captchaToken ? { captchaToken } : {}),
    },
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

  // If vendor, create the vendor record shell (pending verification).
  // Fatal: if this fails the user would have role="vendor" in users but no vendors row,
  // breaking every vendor-specific query downstream.
  if (role === "vendor") {
    const { error: vendorError } = await supabase.from("vendors").insert({
      id: userId,
      verification_status: "pending",
      nin_verified: false,
      cac_verified: false,
    });

    if (vendorError) {
      await admin.auth.admin.deleteUser(userId);
      return { error: "Failed to complete vendor registration. Please try again." };
    }
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
 * Create an anonymous guest session so the user can check out without registering.
 * Creates a Supabase anonymous auth user + a matching users table row (required by
 * orders.customer_id FK). The placeholder email is never shown to the user.
 */
export async function guestSignInAction(captchaToken = null) {
  const supabase = await createClient();

  // Reuse existing session — don't create a duplicate anonymous user
  const { data: { user: existing } } = await supabase.auth.getUser();
  if (existing) {
    revalidatePath("/", "layout");
    return { error: null };
  }

  const { data, error } = await supabase.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : {},
  );
  if (error) {
    // Surface the real Supabase message so misconfiguration is obvious in the UI
    return { error: error.message };
  }
  if (!data?.user) {
    return { error: "Could not start guest session. Please try again." };
  }

  const userId = data.user.id;
  const placeholderEmail = `guest_${userId.replace(/-/g, "").slice(0, 12)}@carmelmart.guest`;

  const admin = createAdminClient();
  const { error: profileError } = await admin.from("users").insert({
    id: userId,
    email: placeholderEmail,
    role: "customer",
    status: "active",
    wallet_balance: 0,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Upgrade an anonymous guest account to a full registered account.
 * Sets password immediately; queues email confirmation via Supabase.
 * The users table email is updated optimistically — history and orders
 * carry over automatically since the UUID stays the same.
 */
export async function convertGuestAction({ email, password, firstName, lastName, phone }) {
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (phone && !NIGERIAN_PHONE_RE.test(phone.trim())) {
    return { error: "Enter a valid Nigerian phone number (e.g. 08012345678)." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated." };
  if (!user.is_anonymous) return { error: "Account is already registered." };

  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return { error: "This email is already registered. Please sign in instead." };
  }

  // Upgrades the anonymous auth user: sets password now, queues email confirmation
  const { error: updateErr } = await supabase.auth.updateUser({
    email: normalizedEmail,
    password,
  });
  if (updateErr) return { error: updateErr.message };

  const referralCode = generateReferralCode();

  const profileUpdate = { email: normalizedEmail, referral_code: referralCode };
  if (firstName?.trim()) profileUpdate.first_name = firstName.trim();
  if (lastName?.trim()) profileUpdate.last_name = lastName.trim();
  if (phone?.trim()) profileUpdate.phone = phone.trim();

  const { error: profileErr } = await admin
    .from("users")
    .update(profileUpdate)
    .eq("id", user.id);

  if (profileErr) return { error: "Could not update your profile. Please contact support." };

  revalidatePath("/", "layout");
  return { error: null, requiresEmailVerification: true };
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
