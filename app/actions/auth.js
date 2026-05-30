"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateReferralCode } from "@/lib/utils";
import { Resend } from "resend";
import { authEmailTemplates } from "@/lib/email/auth";

// ─── Rate limiters ────────────────────────────────────────────────────────────
// Per-email, in-memory. Works for single-instance; swap Map for Redis in multi-node.

function _makeRateLimiter(max, windowMs) {
  const store = new Map(); // email → { count, resetAt }
  return {
    check(email) {
      const now    = Date.now();
      const record = store.get(email);
      if (!record || now > record.resetAt) {
        store.set(email, { count: 1, resetAt: now + windowMs });
        return { limited: false };
      }
      if (record.count >= max) {
        const mins = Math.ceil((record.resetAt - now) / 60_000);
        return { limited: true, retryAfter: mins };
      }
      record.count++;
      return { limited: false };
    },
    clear(email) { store.delete(email); },
  };
}

const _loginRate  = _makeRateLimiter(5, 15 * 60 * 1000); // 5 attempts / 15 min
const _resetRate  = _makeRateLimiter(5, 60 * 60 * 1000); // 5 resets   / 1 hour
const _resendRate = _makeRateLimiter(3, 60 * 60 * 1000); // 3 resends  / 1 hour

function _checkRate(email)  { return _loginRate.check(email); }
function _clearRate(email)  { return _loginRate.clear(email); }

// Nigerian phone: starts with +234 or 0, then 7/8/9, then 0/1, then 8 more digits
const NIGERIAN_PHONE_RE = /^(\+234|0)[789][01]\d{8}$/;

/**
 * Sign in with email + password.
 * Session is stored in HttpOnly cookies by @supabase/ssr — not in localStorage or Zustand.
 * Returns { error } for expected failures (wrong credentials, unverified email).
 * Only throws for unexpected server errors.
 */
export async function loginAction({ email, password, captchaToken = null }) {
  const normalizedEmail = email.trim().toLowerCase();

  const rateCheck = _checkRate(normalizedEmail);
  if (rateCheck.limited) {
    return {
      error: `Too many login attempts. Please try again in ${rateCheck.retryAfter} minute${rateCheck.retryAfter === 1 ? "" : "s"}.`,
    };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    console.error("[loginAction] signInWithPassword error:", error.code, error.message);
    // email_not_confirmed fires only when credentials are correct but the email
    // hasn't been verified — safe to surface (no enumeration risk because the
    // caller already proved they know the password).
    if (error.code === "email_not_confirmed") {
      return {
        error: "Please verify your email before signing in.",
        emailNotConfirmed: true,
        email: normalizedEmail,
      };
    }
    return { error: "Invalid email or password." };
  }

  _clearRate(normalizedEmail);

  // Fetch the DB profile server-side so the client gets role + user data immediately —
  // eliminates the second round-trip (fetchAuthUser) that was needed for the role redirect.
  const { data: profile } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, role, referral_code, wallet_balance, avatar_url")
    .eq("id", authData.user.id)
    .single();

  return {
    error: null,
    user: profile ?? { id: authData.user.id, email: authData.user.email, role: null },
  };
}

/**
 * Create a new account (customer or vendor).
 *
 * Uses admin.generateLink instead of supabase.auth.signUp so that:
 *  - Supabase's per-hour email rate limit is bypassed (admin API is exempt)
 *  - The confirmation email is sent directly via Resend (not through the auth hook)
 *  - All DB inserts use the service-role client, so RLS never blocks the rollback path
 *
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

  // Verify Turnstile captcha server-side when the secret key is configured
  if (captchaToken && process.env.TURNSTILE_SECRET_KEY) {
    try {
      const cfRes  = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: captchaToken }),
      });
      const cfData = await cfRes.json();
      if (!cfData.success) return { error: "Security check failed. Please try again." };
    } catch {
      // If Cloudflare is unreachable, allow through — don't block genuine users
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();
  const BASE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "");
  if (!BASE_URL) {
    console.error("[signupAction] NEXT_PUBLIC_BASE_URL is not set — confirmation email links will be broken. Set it in your environment variables.");
  }

  // Validate referral code server-side if provided
  if (referralCode) {
    const { data: referrer } = await admin
      .from("users")
      .select("id")
      .eq("referral_code", referralCode.trim().toUpperCase())
      .single();
    if (!referrer) {
      return { error: "Invalid referral code. Please check the code and try again." };
    }
  }

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: normalizedEmail,
    password,
    options: { data: { role } },
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return { error: "This email is already registered. Please sign in instead." };
    }
    return { error: "Failed to create account. Please try again." };
  }
  if (!linkData?.user) return { error: "Failed to create account. Please try again." };

  const userId         = linkData.user.id;
  const newReferralCode = generateReferralCode();

  // Insert user profile — use admin client since there is no session yet
  const { error: profileError } = await admin.from("users").insert({
    id:           userId,
    email:        normalizedEmail,
    phone:        phone.trim(),
    role,
    referral_code: newReferralCode,
    referred_by:  referralCode?.trim().toUpperCase() || null,
    wallet_balance: 0,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Failed to complete registration. Please try again." };
  }

  // Vendor shell record — fatal if missing (every vendor query depends on it)
  if (role === "vendor") {
    const { error: vendorError } = await admin.from("vendors").insert({
      id:                  userId,
      verification_status: "pending",
      nin_verified:        false,
      cac_verified:        false,
    });

    if (vendorError) {
      // Delete users row explicitly — don't rely solely on FK cascade
      await admin.from("users").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return { error: "Failed to complete vendor registration. Please try again." };
    }
  }

  // Referral relationship (non-fatal)
  if (referralCode) {
    try {
      const { data: referrer } = await admin
        .from("users")
        .select("id")
        .eq("referral_code", referralCode.trim().toUpperCase())
        .single();

      if (referrer) {
        await admin.from("referrals").insert({
          referrer_id: referrer.id,
          referred_id: userId,
          status:      "pending",
        });
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Vendor path: auto-confirm + sign in immediately ─────────────────────────
  // Vendors go straight to the KYC wizard. Auto-confirm their email server-side
  // so signInWithPassword works, then establish a session now so every KYC server
  // action runs with normal auth. A welcome email is sent by completeVendorPaymentAction.
  if (role === "vendor") {
    let sessionEstablished = false;
    try {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) throw signInError;
      sessionEstablished = true;
    } catch (err) {
      console.error("[signupAction] Vendor auto sign-in failed:", err?.message);
    }
    revalidatePath("/", "layout");
    return { error: null, userId, role: "vendor", requiresEmailVerification: false, sessionEstablished };
  }

  // ── Customer path: send confirmation email ───────────────────────────────────
  try {
    const tokenHash  = linkData.properties?.hashed_token;
    const confirmUrl = `${BASE_URL}/confirm-email?token_hash=${encodeURIComponent(tokenHash)}&type=signup`;
    const name       = normalizedEmail.split("@")[0];
    const resend     = new Resend(process.env.RESEND_API_KEY);
    const template   = authEmailTemplates.signup({ name, confirmUrl });
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL,
      to:      normalizedEmail,
      subject: template.subject,
      html:    template.html,
    });
  } catch (emailError) {
    console.error("[signupAction] Confirmation email failed:", emailError?.message);
  }

  revalidatePath("/", "layout");

  return {
    error: null,
    userId,
    role,
    requiresEmailVerification: true,
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
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("id, email, role, wallet_balance, status")
      .eq("id", existing.id)
      .single();
    revalidatePath("/", "layout");
    return { error: null, user: profile ?? null, isGuest: existing.is_anonymous ?? false };
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
  const guestProfile = { id: userId, email: placeholderEmail, role: "customer", status: "active", wallet_balance: 0 };
  const { error: profileError } = await admin.from("users").insert(guestProfile);

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath("/", "layout");
  return { error: null, user: guestProfile, isGuest: true };
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
/**
 * Send a password reset OTP directly via Resend, bypassing Supabase's
 * per-email rate limit (2/hr on free plan) by using the admin generateLink API.
 * Returns generic { ok: true } on both success and "email not found" to prevent
 * user enumeration. Only fails loudly for validation errors.
 */
export async function sendPasswordResetAction(email) {
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please provide a valid email address." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Rate limit: 5 reset attempts per email per hour to prevent Resend credit abuse
  const rateCheck = _resetRate.check(normalizedEmail);
  if (rateCheck.limited) {
    return {
      ok: false,
      error: `Too many reset attempts. Please try again in ${rateCheck.retryAfter} minute${rateCheck.retryAfter === 1 ? "" : "s"}.`,
    };
  }

  const admin = createAdminClient();

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
  });

  if (error) {
    // Could be "user not found" — return success to prevent enumeration
    console.error("[sendPasswordResetAction] generateLink error:", error.message);
    return { ok: true };
  }

  const otp  = linkData.properties?.email_otp;
  const name = linkData.user?.user_metadata?.name
    || linkData.user?.user_metadata?.first_name
    || normalizedEmail.split("@")[0];

  if (!otp) {
    console.error("[sendPasswordResetAction] generateLink returned no email_otp — cannot send usable code");
    return { ok: true }; // still return ok to avoid enumeration; user can retry
  }

  try {
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const template = authEmailTemplates.recovery({ name, otp });
    const result   = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL,
      to:      normalizedEmail,
      subject: template.subject,
      html:    template.html,
    });
  } catch (emailError) {
    console.error("[sendPasswordResetAction] Resend failed:", emailError?.message);
    // Non-fatal — the OTP is valid even if delivery fails; user can retry
  }

  return { ok: true };
}

/**
 * Reset password from a forgot-password recovery session.
 * Called after verifyOtp (type: "recovery") has established the session in cookies.
 * Using a server action ensures the cookie-based recovery session is read reliably
 * instead of depending on the browser client's in-memory state.
 */
export async function resetPasswordAction({ newPassword }) {
  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Your reset session has expired. Please start the password reset process again." };
  }

  // Use admin API to write the password directly — supabase.auth.updateUser() in a
  // server action with a recovery session cookie can return no error but silently fail
  // to persist the change (GoTrue session state mismatch). The admin API writes straight
  // to the DB with no session dependency and is always authoritative.
  const admin = createAdminClient();
  // email_confirm: true — completing an OTP-verified reset proves email ownership,
  // so we confirm the email at the same time. This fixes login failures caused by
  // email_not_confirmed when the account was created but never verified.
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  });
  if (error) {
    console.error("[resetPasswordAction] updateUserById error:", error);
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("different from the old password") || msg.includes("same as the old password")) {
      return { error: "Your new password must be different from your current password." };
    }
    return { error: "Failed to reset password. Please try again." };
  }

  // Clear the recovery session server-side so the middleware doesn't block /login
  await supabase.auth.signOut({ scope: "local" });

  return { error: null };
}

/**
 * Resend signup confirmation email for an unconfirmed account.
 *
 * Uses the same admin.generateLink + Resend path as signupAction — the
 * send-email hook ignores "signup" events, so we must send directly.
 *
 * Safe against enumeration: always returns { ok: true } for unknown emails
 * and already-confirmed accounts.
 */
export async function resendVerificationAction(email) {
  if (!email?.includes("@")) {
    return { ok: false, error: "Please provide a valid email address." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const rateCheck = _resendRate.check(normalizedEmail);
  if (rateCheck.limited) {
    return {
      ok: false,
      error: `Too many requests. Please try again in ${rateCheck.retryAfter} minute${rateCheck.retryAfter === 1 ? "" : "s"}.`,
    };
  }

  const admin   = createAdminClient();
  const BASE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "");
  if (!BASE_URL) {
    console.error("[resendVerificationAction] NEXT_PUBLIC_BASE_URL is not set — confirmation email links will be broken.");
  }

  // Guard: only resend if the email exists in our users table.
  // Prevents creating a new auth user via generateLink for unknown emails.
  const { data: profile } = await admin
    .from("users")
    .select("id, first_name")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profile) return { ok: true }; // silent — enumeration prevention

  // For existing UNCONFIRMED users, generateLink updates the confirmation token
  // without changing the password. For confirmed users it returns "already registered"
  // which we also treat as ok (user can just sign in).
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type:     "signup",
    email:    normalizedEmail,
    password: crypto.randomUUID(), // required by API signature; ignored for existing users
  });

  if (error) {
    console.log("[resendVerificationAction] generateLink:", error.code, error.message);
    return { ok: true }; // silent — could be confirmed or other transient error
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    console.error("[resendVerificationAction] generateLink returned no hashed_token");
    return { ok: true };
  }

  const confirmUrl = `${BASE_URL}/confirm-email?token_hash=${encodeURIComponent(tokenHash)}&type=signup`;
  const name       = profile.first_name ?? normalizedEmail.split("@")[0];

  try {
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const template = authEmailTemplates.signup({ name, confirmUrl });
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL,
      to:      normalizedEmail,
      subject: template.subject,
      html:    template.html,
    });
  } catch (emailError) {
    console.error("[resendVerificationAction] Resend failed:", emailError?.message);
  }

  return { ok: true };
}

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
