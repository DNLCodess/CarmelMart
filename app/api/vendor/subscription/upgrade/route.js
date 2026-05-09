/**
 * POST /api/vendor/subscription/upgrade
 *
 * Creates a pending payment record and returns checkout parameters
 * for the Flutterwave modal. Pricing is read from platform_settings
 * so the admin can adjust it without a deployment.
 *
 * Rate limited: 5 attempts per user per 10 minutes to prevent
 * unbounded pending payment record creation.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, DEFAULT_PRICES } from "@/lib/subscription";
import { rateLimit, retryAfterSeconds } from "@/lib/rateLimit";

const PRICE_KEYS = [
  "subscription_premium_price_monthly",
  "subscription_vip_price_monthly",
  "subscription_vip_price_annual",
];

async function getSubscriptionPrices(admin) {
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", PRICE_KEYS);

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, parseInt(r.value, 10)]));

  return {
    premium: {
      monthly: map.subscription_premium_price_monthly ?? DEFAULT_PRICES.premium.monthly,
    },
    vip: {
      monthly: map.subscription_vip_price_monthly ?? DEFAULT_PRICES.vip.monthly,
      annual:  map.subscription_vip_price_annual  ?? DEFAULT_PRICES.vip.annual,
    },
  };
}

export async function POST(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
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
    if (!["monthly", "annual"].includes(billing_cycle)) {
      return NextResponse.json(
        { error: "billing_cycle must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }
    if (billing_cycle === "annual" && tier !== "vip") {
      return NextResponse.json(
        { error: "Annual billing is only available for the VIP plan." },
        { status: 400 }
      );
    }

    // ── Resolve price from platform_settings ──────────────────────────────────
    const prices = await getSubscriptionPrices(admin);
    const tierPrices = prices[tier];
    const amount =
      billing_cycle === "annual" && tierPrices.annual != null
        ? tierPrices.annual
        : tierPrices.monthly;

    const plan = getPlan(tier);

    // ── Generate unique payment reference ─────────────────────────────────────
    const reference = `CM-SUB-${Date.now()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 9)}`;

    // ── Insert pending payment record ─────────────────────────────────────────
    // Amount is stored here so verify can compare against it even if the
    // admin changes the price between initiation and completion.
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
