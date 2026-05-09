import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, DEFAULT_PRICES } from "@/lib/subscription";

const PRICE_KEYS = [
  "subscription_premium_price_monthly",
  "subscription_vip_price_monthly",
  "subscription_vip_price_annual",
];

async function fetchPrices(admin) {
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", PRICE_KEYS);

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, parseInt(r.value, 10)]));

  return {
    premium: {
      monthly: map.subscription_premium_price_monthly ?? DEFAULT_PRICES.premium.monthly,
      annual:  null,
    },
    vip: {
      monthly: map.subscription_vip_price_monthly ?? DEFAULT_PRICES.vip.monthly,
      annual:  map.subscription_vip_price_annual  ?? DEFAULT_PRICES.vip.annual,
    },
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch vendor tier and prices in parallel
    const [{ data: vendor }, prices] = await Promise.all([
      admin.from("vendors").select("subscription_tier").eq("id", user.id).single(),
      fetchPrices(admin),
    ]);

    const currentTier = vendor?.subscription_tier ?? "free";

    // Fetch most recent active subscription
    const { data: activeSub } = await admin
      .from("vendor_subscriptions")
      .select("*")
      .eq("vendor_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Auto-expire: paid subscription past expiry → downgrade to free
    const isExpired =
      activeSub &&
      activeSub.tier !== "free" &&
      activeSub.expires_at &&
      new Date(activeSub.expires_at) < new Date();

    if (isExpired) {
      await admin
        .from("vendor_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);

      await admin
        .from("vendors")
        .update({ subscription_tier: "free", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({
        tier: "free",
        plan: getPlan("free"),
        prices,
        subscription: null,
        history: [],
        just_expired: true,
      });
    }

    // Handle cancelled subscriptions that have now passed expiry
    const isCancelledExpired =
      activeSub &&
      activeSub.tier !== "free" &&
      activeSub.status === "cancelled" &&
      activeSub.expires_at &&
      new Date(activeSub.expires_at) < new Date();

    if (isCancelledExpired) {
      await admin
        .from("vendor_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);

      await admin
        .from("vendors")
        .update({ subscription_tier: "free", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({
        tier: "free",
        plan: getPlan("free"),
        prices,
        subscription: null,
        history: [],
        just_expired: true,
      });
    }

    // Billing history (paid plans only, latest 12)
    const { data: history } = await admin
      .from("vendor_subscriptions")
      .select("id, tier, billing_cycle, amount, status, started_at, expires_at, cancelled_at, created_at")
      .eq("vendor_id", user.id)
      .neq("tier", "free")
      .order("created_at", { ascending: false })
      .limit(12);

    return NextResponse.json({
      tier: currentTier,
      plan: getPlan(currentTier),
      prices,
      subscription: activeSub ?? null,
      history: history ?? [],
      just_expired: false,
    });
  } catch (error) {
    console.error("[GET /api/vendor/subscription]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
