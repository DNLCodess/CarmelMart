import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify vendor role
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch current tier from vendors table
    const { data: vendor } = await admin
      .from("vendors")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const currentTier = vendor?.subscription_tier ?? "free";

    // Fetch the most recent active subscription record
    const { data: activeSub } = await admin
      .from("vendor_subscriptions")
      .select("*")
      .eq("vendor_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Auto-expire: paid subscription past its expiry date → downgrade to free
    if (
      activeSub &&
      activeSub.tier !== "free" &&
      activeSub.expires_at &&
      new Date(activeSub.expires_at) < new Date()
    ) {
      await admin
        .from("vendor_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);

      await admin
        .from("vendors")
        .update({
          subscription_tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Return as free immediately so UI reflects the downgrade
      return NextResponse.json({
        tier: "free",
        plan: getPlan("free"),
        subscription: null,
        history: [],
        just_expired: true,
      });
    }

    // Also handle cancelled subscriptions that have now passed their expiry
    if (
      activeSub &&
      activeSub.tier !== "free" &&
      activeSub.status === "cancelled" &&
      activeSub.expires_at &&
      new Date(activeSub.expires_at) < new Date()
    ) {
      await admin
        .from("vendor_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);

      await admin
        .from("vendors")
        .update({
          subscription_tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({
        tier: "free",
        plan: getPlan("free"),
        subscription: null,
        history: [],
        just_expired: true,
      });
    }

    // Fetch billing history (paid plans only, latest 12)
    const { data: history } = await admin
      .from("vendor_subscriptions")
      .select(
        "id, tier, billing_cycle, amount, status, started_at, expires_at, cancelled_at, created_at"
      )
      .eq("vendor_id", user.id)
      .neq("tier", "free")
      .order("created_at", { ascending: false })
      .limit(12);

    return NextResponse.json({
      tier: currentTier,
      plan: getPlan(currentTier),
      subscription: activeSub ?? null,
      history: history ?? [],
      just_expired: false,
    });
  } catch (error) {
    console.error("[GET /api/vendor/subscription]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
