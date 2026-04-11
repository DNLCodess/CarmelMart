import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function guardSuperAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Forbidden — super admin only", status: 403 };
  return { user, admin };
}

// GET /api/admin/auth-requests — list all authorization requests with requester info
export async function GET(request) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    let query = admin
      .from("auth_requests")
      .select("*, requested_by_user:users!auth_requests_requested_by_fkey(id, first_name, last_name, email, role)")
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);

    const { data: requests, error: qErr } = await query;
    if (qErr) throw qErr;

    return NextResponse.json({ requests: requests ?? [] });
  } catch (error) {
    console.error("[GET /api/admin/auth-requests]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/auth-requests
 * Body: { id, action: 'approve' | 'reject', review_note? }
 *
 * On approve: executes the operation immediately (e.g. refund) then marks executed.
 * On reject:  marks as rejected with note.
 */
export async function PATCH(request) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin } = guard;

    const body = await request.json();
    const { id, action, review_note } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required." }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
    }

    // Fetch the request
    const { data: authReq, error: fetchErr } = await admin
      .from("auth_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !authReq) {
      return NextResponse.json({ error: "Authorization request not found." }, { status: 404 });
    }
    if (authReq.status !== "pending") {
      return NextResponse.json(
        { error: `Request is already ${authReq.status}.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      await admin
        .from("auth_requests")
        .update({
          status:      "rejected",
          reviewed_by: user.id,
          review_note: review_note?.trim() ?? null,
          updated_at:  now,
        })
        .eq("id", id);

      return NextResponse.json({ success: true, status: "rejected" });
    }

    // ── APPROVE ────────────────────────────────────────────────────────────────
    const opData = authReq.operation_data ?? {};
    let executionResult = {};

    if (authReq.operation_type === "refund") {
      const { order_id, customer_id, amount, reason } = opData;

      if (!order_id || !customer_id || !amount) {
        return NextResponse.json(
          { error: "Refund request is missing required data (order_id, customer_id, amount)." },
          { status: 400 }
        );
      }

      // Verify order still exists
      const { data: order } = await admin
        .from("orders")
        .select("id, total, status")
        .eq("id", order_id)
        .single();

      if (!order) return NextResponse.json({ error: "Order no longer exists." }, { status: 404 });
      if (order.status === "refunded") {
        return NextResponse.json({ error: "Order has already been refunded." }, { status: 400 });
      }
      if (Number(amount) > order.total) {
        return NextResponse.json(
          { error: `Refund amount exceeds order total of ₦${order.total.toLocaleString()}.` },
          { status: 400 }
        );
      }

      // Credit wallet
      const { data: currentUser } = await admin
        .from("users")
        .select("wallet_balance")
        .eq("id", customer_id)
        .single();

      await admin
        .from("users")
        .update({ wallet_balance: (currentUser?.wallet_balance ?? 0) + Number(amount) })
        .eq("id", customer_id);

      const reference = `CM-REF-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase()}`;

      await admin.from("wallet_transactions").insert({
        user_id:     customer_id,
        type:        "credit",
        amount:      Number(amount),
        description: `Admin refund${reason ? `: ${reason}` : ""} — Order ${order_id.slice(0, 8).toUpperCase()} (authorized)`,
        reference,
      });

      await admin.from("orders").update({ status: "refunded" }).eq("id", order_id);

      executionResult = { reference, refunded_amount: amount };
    }

    // Mark request as approved + executed
    await admin
      .from("auth_requests")
      .update({
        status:      "approved",
        reviewed_by: user.id,
        review_note: review_note?.trim() ?? null,
        executed_at: now,
        updated_at:  now,
      })
      .eq("id", id);

    return NextResponse.json({ success: true, status: "approved", ...executionResult });
  } catch (error) {
    console.error("[PATCH /api/admin/auth-requests]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
