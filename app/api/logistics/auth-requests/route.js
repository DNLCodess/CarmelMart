import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/logistics/auth-requests
 * Logistics admin submits a request for super admin to authorize a sensitive operation.
 *
 * Body: {
 *   operation_type: 'refund' | 'payout_override' | 'other',
 *   operation_data: { order_id?, customer_id?, amount?, reason?, description? }
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("role, first_name, last_name, email")
      .eq("id", user.id)
      .single();

    // Only logistics admins (not super admins — they do it directly)
    if (!profile || profile.role !== "logistics_admin") {
      return NextResponse.json(
        { error: "Forbidden. Only logistics admins can submit authorization requests." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { operation_type, operation_data } = body;

    const validTypes = ["refund", "payout_override", "other"];
    if (!validTypes.includes(operation_type)) {
      return NextResponse.json(
        { error: `Invalid operation_type. Must be one of: ${validTypes.join(", ")}.` },
        { status: 400 }
      );
    }
    if (!operation_data || typeof operation_data !== "object") {
      return NextResponse.json({ error: "operation_data must be an object." }, { status: 400 });
    }

    // For refund requests, validate the order exists
    if (operation_type === "refund") {
      const { order_id, amount } = operation_data;
      if (!order_id) {
        return NextResponse.json({ error: "operation_data.order_id is required for refund requests." }, { status: 400 });
      }
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "operation_data.amount must be > 0 for refund requests." }, { status: 400 });
      }
      const { data: order } = await admin.from("orders").select("id, total").eq("id", order_id).single();
      if (!order) return NextResponse.json({ error: "Referenced order not found." }, { status: 404 });
      if (Number(amount) > order.total) {
        return NextResponse.json(
          { error: `Refund amount (₦${Number(amount).toLocaleString()}) exceeds order total (₦${order.total.toLocaleString()}).` },
          { status: 400 }
        );
      }
    }

    // Check for an existing pending request for the same order (prevent duplicates)
    if (operation_data.order_id) {
      const { count } = await admin
        .from("auth_requests")
        .select("id", { count: "exact", head: true })
        .eq("requested_by", user.id)
        .eq("status", "pending")
        .contains("operation_data", { order_id: operation_data.order_id });

      if (count && count > 0) {
        return NextResponse.json(
          { error: "A pending authorization request already exists for this order. Wait for super admin review." },
          { status: 409 }
        );
      }
    }

    const { data: authRequest, error: insertErr } = await admin
      .from("auth_requests")
      .insert({
        requested_by:   user.id,
        operation_type,
        operation_data: {
          ...operation_data,
          requester_name:  [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
          requester_email: profile.email,
        },
        status:     "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, auth_request: authRequest }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/logistics/auth-requests]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/logistics/auth-requests — logistics admin views their own requests
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "logistics_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: requests, error: qErr } = await admin
      .from("auth_requests")
      .select("id, operation_type, operation_data, status, review_note, created_at, updated_at")
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (qErr) throw qErr;

    return NextResponse.json({ requests: requests ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
