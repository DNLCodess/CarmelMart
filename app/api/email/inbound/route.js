/**
 * app/api/email/inbound/route.js
 *
 * Mailgun Inbound Routes webhook — receives emails sent to support@carmelmart.store,
 * stores them in the `support_emails` table, and forwards a notification to the admin.
 *
 * Setup steps (one-time):
 *  1. Create a free Mailgun account at mailgun.com
 *  2. Add carmelmart.store as a receiving domain
 *  3. Add Mailgun MX records to your DNS:
 *       MX  10  mxa.mailgun.org
 *       MX  10  mxb.mailgun.org
 *  4. Create an Inbound Route:
 *       Expression: match_recipient("support@carmelmart.store")
 *       Action:     forward("https://carmelmart.store/api/email/inbound")
 *  5. Set MAILGUN_WEBHOOK_KEY in env (found in Mailgun → Settings → API Keys → HTTP Webhook Signing Key)
 */

import { NextResponse } from "next/server";
import { createHmac }   from "crypto";
import { Resend }       from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyMailgun(signingKey, timestamp, token, signature) {
  const value = timestamp + token;
  const hash  = createHmac("sha256", signingKey).update(value).digest("hex");
  return hash === signature;
}

function extractEmail(raw) {
  if (!raw) return { email: "", name: "" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^["']|["']$/g, ""), email: match[2].trim() };
  return { email: raw.trim(), name: "" };
}

export async function POST(request) {
  // Mailgun sends multipart/form-data
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const timestamp = form.get("timestamp") ?? "";
  const token     = form.get("token")     ?? "";
  const signature = form.get("signature") ?? "";

  // Verify request came from Mailgun
  const signingKey = process.env.MAILGUN_WEBHOOK_KEY;
  if (signingKey) {
    if (!verifyMailgun(signingKey, timestamp, token, signature)) {
      console.error("[inbound] Mailgun signature verification failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const rawFrom  = form.get("From")       ?? form.get("from")       ?? "";
  const subject  = form.get("Subject")    ?? form.get("subject")    ?? "(no subject)";
  const bodyText = form.get("body-plain") ?? form.get("body_plain") ?? "";
  const bodyHtml = form.get("body-html")  ?? form.get("body_html")  ?? "";

  const { email: fromEmail, name: fromName } = extractEmail(rawFrom);

  // Collect raw payload for debugging
  const rawPayload = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") rawPayload[key] = value;
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("support_emails").insert({
    from_email:  fromEmail || rawFrom,
    from_name:   fromName  || null,
    subject,
    body_text:   bodyText,
    body_html:   bodyHtml,
    raw_payload: rawPayload,
  });

  if (dbError) {
    console.error("[inbound] DB insert failed:", dbError.message);
    // Return 200 so Mailgun doesn't retry
    return NextResponse.json({ error: "DB error" }, { status: 200 });
  }

  // Forward notification to admin
  try {
    const resend     = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL || "support@carmelmart.store";
    const fromLabel  = fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail;
    const baseUrl    = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");

    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL || "CarmelMart <support@carmelmart.store>",
      to:      adminEmail,
      subject: `[Support] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
            New support email received at <strong>support@carmelmart.store</strong>
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:80px;">From</td><td style="padding:6px 0;font-weight:600;">${fromLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Subject</td><td style="padding:6px 0;font-weight:600;">${subject}</td></tr>
          </table>
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f9fafb;font-size:14px;line-height:1.6;">
            ${bodyHtml || `<pre style="margin:0;white-space:pre-wrap;">${bodyText}</pre>`}
          </div>
          <p style="margin-top:20px;">
            <a href="${baseUrl}/admin/support" style="background:#560238;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
              View in Admin Panel
            </a>
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[inbound] Forward notification failed:", e?.message);
  }

  return NextResponse.json({ ok: true });
}
