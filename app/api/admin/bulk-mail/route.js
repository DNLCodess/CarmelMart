import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBulkMailCampaign, buildBulkEmailHtml } from "@/lib/email";

// ── Audience resolver ─────────────────────────────────────────────────────────

async function resolveRecipients(admin, audience) {
  let query = admin.from("users").select("email").not("email", "is", null);

  if (audience === "customers") {
    query = query.eq("role", "customer");
  } else if (audience === "vendors") {
    query = query.eq("role", "vendor");
  } else if (audience === "verified_vendors") {
    const { data: verifiedVendors } = await admin
      .from("vendors")
      .select("id")
      .eq("verification_status", "verified");
    const ids = (verifiedVendors ?? []).map((v) => v.id);
    if (!ids.length) return [];
    query = admin.from("users").select("email").in("id", ids);
  } else if (audience === "premium_vendors") {
    const { data: rows } = await admin
      .from("vendors")
      .select("id")
      .eq("subscription_tier", "premium");
    const ids = (rows ?? []).map((v) => v.id);
    if (!ids.length) return [];
    query = admin.from("users").select("email").in("id", ids);
  } else if (audience === "vip_vendors") {
    const { data: rows } = await admin
      .from("vendors")
      .select("id")
      .eq("subscription_tier", "vip");
    const ids = (rows ?? []).map((v) => v.id);
    if (!ids.length) return [];
    query = admin.from("users").select("email").in("id", ids);
  } else if (audience === "paid_vendors") {
    // Premium + VIP combined
    const { data: rows } = await admin
      .from("vendors")
      .select("id")
      .in("subscription_tier", ["premium", "vip"]);
    const ids = (rows ?? []).map((v) => v.id);
    if (!ids.length) return [];
    query = admin.from("users").select("email").in("id", ids);
  }
  // "all" → no extra filter (all users)

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((u) => u.email).filter(Boolean);
}

// ── GET — recipient count preview ─────────────────────────────────────────────

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience") || "all";

    const recipients = await resolveRecipients(admin, audience);

    return NextResponse.json({ count: recipients.length, audience });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST — send campaign ──────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role, email").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const {
      audience   = "all",
      template   = "custom",
      subject,
      headline,
      subheadline,
      body,
      ctaText,
      ctaUrl,
      badge,
      accentColor,
      testMode   = false,  // if true, only send to admin's own email
    } = await request.json();

    if (!subject?.trim())  return NextResponse.json({ error: "Subject is required" },  { status: 400 });
    if (!headline?.trim()) return NextResponse.json({ error: "Headline is required" }, { status: 400 });

    // Build recipients list
    let recipients;
    if (testMode) {
      recipients = [profile.email];
    } else {
      recipients = await resolveRecipients(admin, audience);
    }

    if (!recipients.length) {
      return NextResponse.json({ error: "No recipients found for the selected audience" }, { status: 400 });
    }

    // Build the email HTML
    const html = buildBulkEmailHtml({
      template,
      headline:    headline.trim(),
      subheadline: subheadline?.trim() ?? "",
      body:        body?.trim() ?? "",
      ctaText:     ctaText?.trim() ?? "",
      ctaUrl:      ctaUrl?.trim() ?? "",
      badge:       badge?.trim() ?? "",
      accentColor,
    });

    // Send campaign
    const result = await sendBulkMailCampaign({ recipients, subject: subject.trim(), html });

    // Log the campaign in the DB (optional — only if you have a campaigns table)
    // Silently skip if table doesn't exist
    try {
      await admin.from("email_campaigns").insert({
        admin_id:    user.id,
        audience,
        template,
        subject:     subject.trim(),
        headline:    headline.trim(),
        recipients:  result.total,
        sent:        result.sent,
        failed:      result.failed,
        test_mode:   testMode,
        sent_at:     new Date().toISOString(),
      });
    } catch { /* table may not exist yet */ }

    return NextResponse.json({
      success: true,
      sent:    result.sent,
      failed:  result.failed,
      total:   result.total,
      testMode,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
