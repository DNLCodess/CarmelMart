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

export async function GET() {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: flaggedOrders },
      { data: flaggedUsers },
      { data: podRisks },
      { data: failedPayments },
    ] = await Promise.all([
      // Manually flagged orders
      ctx.admin
        .from("orders")
        .select("id, total, status, created_at, fraud_reason, fraud_flagged_at, users!customer_id(id, email, first_name, last_name, phone)")
        .eq("fraud_flagged", true)
        .order("fraud_flagged_at", { ascending: false })
        .limit(50),

      // Manually flagged users
      ctx.admin
        .from("users")
        .select("id, email, first_name, last_name, phone, role, created_at, fraud_reason, fraud_flagged_at")
        .eq("fraud_flagged", true)
        .order("fraud_flagged_at", { ascending: false })
        .limit(50),

      // Auto-detected: POD blacklisted users with recent orders
      ctx.admin
        .from("users")
        .select("id, email, first_name, last_name, phone, pod_refused_count, pod_blacklisted_at")
        .eq("pod_blacklisted", true)
        .eq("fraud_flagged", false) // don't double-count already flagged
        .limit(20),

      // Auto-detected: Failed payments in last 30 days (multiple per user)
      ctx.admin
        .from("payments")
        .select("user_id, created_at, users!user_id(email, first_name, last_name)")
        .eq("status", "failed")
        .gte("created_at", thirtyDaysAgo)
        .limit(100),
    ]);

    // Aggregate failed payments by user
    const failMap = {};
    for (const p of failedPayments || []) {
      if (!p.user_id) continue;
      if (!failMap[p.user_id]) {
        failMap[p.user_id] = {
          userId:    p.user_id,
          email:     p.users?.email ?? "—",
          name:      [p.users?.first_name, p.users?.last_name].filter(Boolean).join(" ") || "—",
          failCount: 0,
        };
      }
      failMap[p.user_id].failCount++;
    }
    // Only show users with 3+ failed payments
    const highFailUsers = Object.values(failMap)
      .filter((u) => u.failCount >= 3)
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 20);

    return NextResponse.json({
      flaggedOrders: (flaggedOrders || []).map((o) => ({
        id:         o.id,
        total:      o.total,
        status:     o.status,
        reason:     o.fraud_reason,
        flaggedAt:  o.fraud_flagged_at,
        customer: {
          id:    o.users?.id,
          email: o.users?.email,
          name:  [o.users?.first_name, o.users?.last_name].filter(Boolean).join(" ") || "—",
          phone: o.users?.phone,
        },
      })),
      flaggedUsers: (flaggedUsers || []).map((u) => ({
        id:        u.id,
        email:     u.email,
        name:      [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
        phone:     u.phone,
        reason:    u.fraud_reason,
        flaggedAt: u.fraud_flagged_at,
      })),
      autoRisks: {
        podBlacklisted: (podRisks || []).map((u) => ({
          id:          u.id,
          email:       u.email,
          name:        [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
          phone:       u.phone,
          refusals:    u.pod_refused_count,
          blacklistedAt: u.pod_blacklisted_at,
        })),
        highFailPayments: highFailUsers,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — flag or unflag an order or user
export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type, id, action, reason } = await request.json();
    // type: "order" | "user"
    // action: "flag" | "unflag"

    if (!["order", "user"].includes(type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!["flag", "unflag"].includes(action))
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });
    if (action === "flag" && !reason?.trim())
      return NextResponse.json({ error: "Reason is required to flag" }, { status: 400 });

    const table  = type === "order" ? "orders" : "users";
    const update = action === "flag"
      ? { fraud_flagged: true,  fraud_reason: reason.trim(), fraud_flagged_at: new Date().toISOString(), fraud_flagged_by: ctx.user.id }
      : { fraud_flagged: false, fraud_reason: null, fraud_flagged_at: null, fraud_flagged_by: null };

    const { error } = await ctx.admin.from(table).update(update).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
