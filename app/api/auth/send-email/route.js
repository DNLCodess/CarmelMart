/**
 * app/api/auth/send-email/route.js
 *
 * Supabase "Send Email" auth hook — intercepts every Supabase auth email
 * (signup, password reset, magic link, email change, re-auth OTP) and
 * delivers it via Resend instead of Supabase's built-in mailer.
 *
 * Configure in Supabase dashboard:
 *   Authentication → Hooks → Send Email
 *   URL:    https://<your-domain>/api/auth/send-email
 *   Secret: value of SUPABASE_AUTH_HOOK_SECRET env var
 *
 * Supabase retries the hook on any non-2xx response, so we always return
 * 200 even when Resend fails — a failed send is logged but never causes
 * Supabase to block the auth flow.
 */

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { authEmailTemplates } from "@/lib/email/auth";

const resend     = new Resend(process.env.RESEND_API_KEY);
const FROM       = process.env.RESEND_FROM_EMAIL;
const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;
const BASE_URL   = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");

console.log("[auth-hook] ENV check:", {
  RESEND_API_KEY:         process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}...)` : "MISSING",
  RESEND_FROM_EMAIL:      FROM || "MISSING",
  SUPABASE_AUTH_HOOK_SECRET: HOOK_SECRET ? `set (${HOOK_SECRET.slice(0, 6)}...)` : "MISSING",
  BASE_URL:               BASE_URL || "MISSING",
});

// Builds the link that lands on CarmelMart's existing /confirm-email page,
// which calls verifyOtp({ token_hash, type }) client-side.
function buildConfirmUrl(tokenHash, type) {
  return `${BASE_URL}/confirm-email?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}

async function sendEmail({ to, subject, html }) {
  console.log("[auth-hook] Sending email via Resend:", { from: FROM, to, subject });
  const result = await resend.emails.send({ from: FROM, to, subject, html });
  console.log("[auth-hook] Resend response:", result);
  return result;
}

export async function POST(request) {
  // Verify the shared secret Supabase sends as a Bearer token
  const authorization = request.headers.get("authorization");
  if (!HOOK_SECRET || authorization !== `Bearer ${HOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user, email_data } = payload;
  const {
    email_action_type,
    token,         // 6-digit OTP (recovery, reauthentication)
    token_hash,    // hashed token for link-based verification
    token_hash_new, // second hash for email_change (new address)
  } = email_data;

  console.log("[auth-hook] Incoming request:", {
    email_action_type,
    user_email:    user?.email,
    user_metadata: user?.user_metadata,
    token:         token ? `${token.slice(0, 4)}...` : null,
    token_hash:    token_hash ? `${token_hash.slice(0, 12)}...` : null,
    token_hash_new: token_hash_new ? `${token_hash_new.slice(0, 12)}...` : null,
    new_email:     user?.new_email || null,
  });

  const name = user.user_metadata?.name
    || user.user_metadata?.first_name
    || user.email.split("@")[0];

  try {
    if (email_action_type === "email_change") {
      // Two emails: one to the current address, one to the new address
      const jobs = [];

      if (token_hash) {
        const tmpl = authEmailTemplates.email_change({
          name,
          confirmUrl: buildConfirmUrl(token_hash, "email_change"),
          isNewAddress: false,
        });
        jobs.push(sendEmail({ to: user.email, ...tmpl }));
      }

      if (token_hash_new && user.new_email) {
        const tmpl = authEmailTemplates.email_change({
          name,
          confirmUrl: buildConfirmUrl(token_hash_new, "email_change"),
          isNewAddress: true,
          newEmail: user.new_email,
        });
        jobs.push(sendEmail({ to: user.new_email, ...tmpl }));
      }

      await Promise.all(jobs);

    } else if (email_action_type === "recovery") {
      // CarmelMart uses an OTP-based reset flow (verifyOtp), NOT a magic link,
      // so we send the 6-digit code rather than a confirm button.
      const tmpl = authEmailTemplates.recovery({ name, otp: token });
      await sendEmail({ to: user.email, ...tmpl });

    } else {
      const templateFn = authEmailTemplates[email_action_type];

      if (!templateFn) {
        console.error(`[auth-hook] No template found for action type: "${email_action_type}". Available: ${Object.keys(authEmailTemplates).join(", ")}`);
        return NextResponse.json({});
      }

      const tmpl = templateFn({
        name,
        email: user.email,
        confirmUrl: token_hash ? buildConfirmUrl(token_hash, email_action_type) : null,
        otp: token,
      });

      await sendEmail({ to: user.email, ...tmpl });
    }
    console.log("[auth-hook] Email sent successfully for action:", email_action_type);
  } catch (err) {
    // Log but return 200 — Supabase retries on non-200 and the token does
    // not rotate between retries, so repeated sends are safe.
    console.error("[auth-hook] Resend send FAILED:", {
      message: err?.message,
      name:    err?.name,
      stack:   err?.stack?.split("\n")[0],
    });
  }

  // Supabase expects an empty JSON object on success
  return NextResponse.json({});
}
