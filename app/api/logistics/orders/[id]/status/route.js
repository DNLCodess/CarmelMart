import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusUpdate } from "@/lib/email";

// Logistics admins can only move orders through delivery states.
// Refunds / cancellations require super admin or an authorized auth_request.
const ALLOWED_TRANSITIONS = {
  pending:    ["confirmed", "processing"],
  confirmed:  ["processing", "shipped"],
  processing: ["shipped"],
  shipped:    ["delivered"],
};

async function guardLogistics() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "logistics_admin"].includes(profile.role)) {
    return { error: "Forbidden", status: 403 };
  }
  return { user, admin, role: profile.role };
}

/**
 * PATCH /api/logistics/orders/[id]/status
 * Body: { status: 'confirmed' | 'processing' | 'shipped' | 'delivered', note? }
 *
 * Logistics admins: limited to delivery progression states only.
 * Super admins: can also set cancelled (but refunds still go via auth_requests).
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin, role } = guard;
    const { id: orderId } = await params;

    const body = await request.json();
    const { status: newStatus, note } = body;

    if (!newStatus) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    // Fetch current order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, customer_id, total, payment_method, delivery_address")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Validate transition
    const currentStatus = order.status;

    if (role === "logistics_admin") {
      // Logistics admins: strict delivery-state transitions only
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot move order from '${currentStatus}' to '${newStatus}'. Allowed next states: [${allowed.join(", ")}].`,
            code:  "INVALID_TRANSITION",
          },
          { status: 400 }
        );
      }
    } else {
      // Super admin: allow all except refunded (that goes through auth_request / refund API)
      const allStates = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
      if (!allStates.includes(newStatus)) {
        return NextResponse.json({ error: `Invalid status '${newStatus}'.` }, { status: 400 });
      }
      if (newStatus === "refunded") {
        return NextResponse.json(
          { error: "Use the refund endpoint to issue refunds." },
          { status: 400 }
        );
      }
    }

    if (currentStatus === newStatus) {
      return NextResponse.json({ error: "Order is already in that status." }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update order status
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: now })
      .eq("id", orderId);
    if (updateErr) throw updateErr;

    // Track delivery milestones on order_logistics
    if (["shipped", "delivered"].includes(newStatus)) {
      const logUpdate = {};
      if (newStatus === "shipped")   logUpdate.pickup_confirmed_at   = now;
      if (newStatus === "delivered") logUpdate.delivery_confirmed_at = now;
      logUpdate.updated_at = now;

      // Upsert: create record if not exists (orders without an explicit assignment)
      await admin
        .from("order_logistics")
        .upsert({ order_id: orderId, ...logUpdate }, { onConflict: "order_id" });
    }

    // Send status update email to customer (fire-and-forget)
    try {
      const { data: customer } = await admin
        .from("users")
        .select("email")
        .eq("id", order.customer_id)
        .single();
      if (customer?.email) {
        await sendOrderStatusUpdate({
          to: customer.email,
          order,
          newStatus,
        });
      }
    } catch (emailErr) {
      console.error("[status] customer email failed (non-fatal):", emailErr.message);
    }

    return NextResponse.json({ success: true, new_status: newStatus });
  } catch (error) {
    console.error("[PATCH /api/logistics/orders/[id]/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
