/**
 * app/api/auth/send-email/route.js
 *
 * Supabase "Send Email" auth hook — handles auth email types that cannot be
 * bypassed via the admin API and must still go through Supabase's hook system:
 *
 *   email_change    — triggered by auth.updateUser({ email }); requires two
 *                     confirmation emails (old + new address) that Supabase
 *                     constructs internally; no admin.generateLink equivalent.
 *   reauthentication — triggered by auth.reauthenticate(); OTP is generated
 *                     internally by Supabase; no admin API equivalent.
 *
 * Events handled elsewhere (NOT via this hook):
 *   signup   → signupAction in app/actions/auth.js (admin.generateLink + Resend)
 *   recovery → sendPasswordResetAction in app/actions/auth.js (admin.generateLink + Resend)
 *
 * Configure in Supabase dashboard:
 *   Authentication → Hooks → Send Email
 *   URL:    https://<your-domain>/api/auth/send-email
 *   Secret: value of SUPABASE_AUTH_HOOK_SECRET env var
 */

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { authEmailTemplates } from "@/lib/email/auth";

// Builds the link that lands on CarmelMart's existing /confirm-email page,
// which calls verifyOtp({ token_hash, type }) client-side.
function buildConfirmUrl(tokenHash, type, baseUrl) {
  return `${baseUrl}/confirm-email?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}

async function sendEmail({ to, subject, html, from }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log("[auth-hook] Sending email via Resend:", { from, to, subject });
  const result = await resend.emails.send({ from, to, subject, html });
  console.log("[auth-hook] Resend response:", result);
  return result;
}

export async function POST(request) {
  // Read env vars inside the handler so Vercel propagates them on every invocation
  const resendKey   = process.env.RESEND_API_KEY;
  const fromEmail   = process.env.RESEND_FROM_EMAIL;
  const hookSecret  = process.env.SUPABASE_AUTH_HOOK_SECRET;
  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");

  console.log("[auth-hook] ENV check:", {
    RESEND_API_KEY:            resendKey  ? `set (${resendKey.slice(0, 8)}...)`  : "MISSING",
    RESEND_FROM_EMAIL:         fromEmail  || "MISSING",
    SUPABASE_AUTH_HOOK_SECRET: hookSecret ? `set (${hookSecret.slice(0, 6)}...)` : "MISSING",
    NEXT_PUBLIC_BASE_URL:      baseUrl    || "MISSING",
  });

  const authorization = request.headers.get("authorization");
  console.log("[auth-hook] Authorization header:", authorization ? `Bearer ${authorization.slice(7, 13)}...` : "MISSING");

  if (!hookSecret || authorization !== `Bearer ${hookSecret}`) {
    console.error("[auth-hook] Auth check FAILED — header vs secret mismatch or secret not set");
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
          confirmUrl: buildConfirmUrl(token_hash, "email_change", baseUrl),
          isNewAddress: false,
        });
        jobs.push(sendEmail({ to: user.email, from: fromEmail, ...tmpl }));
      }

      if (token_hash_new && user.new_email) {
        const tmpl = authEmailTemplates.email_change({
          name,
          confirmUrl: buildConfirmUrl(token_hash_new, "email_change", baseUrl),
          isNewAddress: true,
          newEmail: user.new_email,
        });
        jobs.push(sendEmail({ to: user.new_email, from: fromEmail, ...tmpl }));
      }

      await Promise.all(jobs);

    } else if (email_action_type === "reauthentication") {
      const tmpl = authEmailTemplates.reauthentication({ name, otp: token });
      await sendEmail({ to: user.email, from: fromEmail, ...tmpl });

    } else {
      // signup and recovery are handled by server actions (admin.generateLink + Resend).
      // magiclink and invite are not used in this app but would land here if triggered.
      console.warn(`[auth-hook] Unhandled action type: "${email_action_type}" — no email sent.`);
      return NextResponse.json({});
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
