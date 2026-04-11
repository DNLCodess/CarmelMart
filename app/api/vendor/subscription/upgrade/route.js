/**
 * POST /api/vendor/subscription/upgrade
 *
 * Creates a pending payment record and returns checkout parameters
 * for the Flutterwave modal.
 *
 * Rate limited: 5 attempts per user per 10 minutes to prevent
 * unbounded pending payment record creation.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, getPlanPrice } from "@/lib/subscription";
import { rateLimit, retryAfterSeconds } from "@/lib/rateLimit";

export async function POST(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    // 5 checkout initiations per 10 minutes per vendor.
    // Prevents spam-creating pending payment records.
    const rl = rateLimit(`sub-upgrade:${user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many upgrade attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
        }
      );
    }

    const admin = createAdminClient();

    // Role check — vendors only, fetch name + email for Flutterwave customer info
    const { data: profile } = await admin
      .from("users")
      .select("role, first_name, last_name, email")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tier, billing_cycle = "monthly" } = body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!["premium", "vip"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'premium' or 'vip'." },
        { status: 400 }
      );
    }
    if (billing_cycle === "annual" && tier !== "vip") {
      return NextResponse.json(
        { error: "Annual billing is only available for the VIP plan." },
        { status: 400 }
      );
    }
    if (!["monthly", "annual"].includes(billing_cycle)) {
      return NextResponse.json(
        { error: "billing_cycle must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    const plan   = getPlan(tier);
    const amount = getPlanPrice(tier, billing_cycle);

    // ── Generate unique payment reference ─────────────────────────────────────
    const reference = `CM-SUB-${Date.now()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 9)}`;

    // ── Insert pending payment record ─────────────────────────────────────────
    // The verify endpoint and webhook both look this up to enforce ownership
    // and idempotency. verification_type encodes tier + billing_cycle for the
    // webhook handler (e.g., "premium_monthly", "vip_annual").
    const { error: paymentError } = await admin.from("payments").insert({
      user_id:           user.id,
      amount,
      reference,
      status:            "pending",
      type:              "subscription",
      payment_provider:  "flutterwave",
      verification_type: `${tier}_${billing_cycle}`,
      created_at:        new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    const customerName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      user.email.split("@")[0];

    return NextResponse.json({
      success:        true,
      reference,
      amount,
      tier,
      billing_cycle,
      plan_name:      plan.name,
      customer_email: user.email,
      customer_name:  customerName,
    });
  } catch (error) {
    console.error("[POST /api/vendor/subscription/upgrade]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
