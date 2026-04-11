import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
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

    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "Vendor requested cancellation";

    // Find the active paid subscription (not a free-tier record)
    const { data: activeSub } = await admin
      .from("vendor_subscriptions")
      .select("id, tier, expires_at, status")
      .eq("vendor_id", user.id)
      .eq("status", "active")
      .neq("tier", "free")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeSub) {
      return NextResponse.json(
        { error: "No active paid subscription found to cancel." },
        { status: 404 }
      );
    }

    // Mark as cancelled — plan remains active until expires_at,
    // then GET /subscription auto-downgrades to free on next fetch.
    const { error: cancelError } = await admin
      .from("vendor_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSub.id);

    if (cancelError) throw cancelError;

    const expiryFormatted = activeSub.expires_at
      ? new Date(activeSub.expires_at).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    return NextResponse.json({
      success: true,
      message: expiryFormatted
        ? `Your ${activeSub.tier.charAt(0).toUpperCase() + activeSub.tier.slice(1)} plan will stay active until ${expiryFormatted}, then revert to Free.`
        : `Your subscription has been cancelled.`,
      expires_at: activeSub.expires_at,
    });
  } catch (error) {
    console.error("[POST /api/vendor/subscription/cancel]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
