import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return { user, admin };
}

// GET — list users with POD activity (blacklisted and high-refusal-count)
export async function GET() {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data } = await ctx.admin
      .from("users")
      .select("id, email, first_name, last_name, pod_refused_count, pod_blacklisted, pod_blacklisted_at, pod_blacklist_reason")
      .or("pod_refused_count.gt.0,pod_blacklisted.eq.true")
      .order("pod_refused_count", { ascending: false });

    const users = (data || []).map((u) => ({
      id:              u.id,
      email:           u.email,
      name:            [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      refusedCount:    u.pod_refused_count,
      blacklisted:     u.pod_blacklisted,
      blacklistedAt:   u.pod_blacklisted_at
        ? new Date(u.pod_blacklisted_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : null,
      reason: u.pod_blacklist_reason,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — record a refusal OR manage blacklist status
export async function PATCH(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, action, orderId, notes, reason } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (action === "record_refusal") {
      // Increment refusal count (trigger will auto-blacklist at 3)
      const { data: current } = await ctx.admin
        .from("users")
        .select("pod_refused_count")
        .eq("id", userId)
        .single();

      await ctx.admin
        .from("users")
        .update({ pod_refused_count: (current?.pod_refused_count ?? 0) + 1 })
        .eq("id", userId);

      // Insert refusal record for audit trail
      await ctx.admin.from("pod_refusals").insert({
        user_id:     userId,
        order_id:    orderId || null,
        notes:       notes || null,
        recorded_by: ctx.user.id,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "blacklist") {
      await ctx.admin.from("users").update({
        pod_blacklisted:     true,
        pod_blacklisted_at:  new Date().toISOString(),
        pod_blacklist_reason: reason || "Manually blacklisted by admin",
      }).eq("id", userId);
      return NextResponse.json({ success: true });
    }

    if (action === "unblacklist") {
      await ctx.admin.from("users").update({
        pod_blacklisted:     false,
        pod_blacklisted_at:  null,
        pod_blacklist_reason: null,
        pod_refused_count:   0,
      }).eq("id", userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
