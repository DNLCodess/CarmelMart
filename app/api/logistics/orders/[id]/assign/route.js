import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function guardLogistics() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, first_name, last_name, email")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "logistics_admin"].includes(profile.role)) {
    return { error: "Forbidden", status: 403 };
  }
  return { user, admin, profile };
}

/**
 * PATCH /api/logistics/orders/[id]/assign
 * Body: { rider_id }
 *
 * Assigns an in-house rider (role='rider') to the order.
 * Notifies the rider via an in-app notification.
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin } = guard;
    const { id: orderId } = await params;

    const body = await request.json();
    const { rider_id } = body;

    if (!rider_id) {
      return NextResponse.json({ error: "rider_id is required." }, { status: 400 });
    }

    // Verify order exists and is assignable
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, total, payment_method, delivery_address, customer_id")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot assign a rider to a ${order.status} order.` },
        { status: 400 }
      );
    }

    // Verify rider exists, is active, and has the rider role
    const { data: rider, error: riderErr } = await admin
      .from("users")
      .select("id, first_name, last_name, phone, role, status")
      .eq("id", rider_id)
      .single();
    if (riderErr || !rider) {
      return NextResponse.json({ error: "Rider not found." }, { status: 404 });
    }
    if (rider.role !== "rider") {
      return NextResponse.json({ error: "User is not a rider." }, { status: 400 });
    }
    if (rider.status !== "active") {
      return NextResponse.json({ error: "This rider account is not active." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const shortId = `#CM-${orderId.slice(0, 8).toUpperCase()}`;

    // Assign rider to order
    const { error: updateErr } = await admin
      .from("orders")
      .update({ rider_id, updated_at: now })
      .eq("id", orderId);
    if (updateErr) throw updateErr;

    // Auto-progress to confirmed if still pending
    if (order.status === "pending") {
      await admin
        .from("orders")
        .update({ status: "confirmed", updated_at: now })
        .eq("id", orderId);
    }

    // Notify the rider (fire-and-forget)
    try {
      const addr = order.delivery_address ?? {};
      await admin.from("notifications").insert({
        user_id: rider_id,
        type:    "delivery_assigned",
        title:   `New Delivery: ${shortId}`,
        message: `You have been assigned order ${shortId} — ${addr.city ?? ""}${addr.state ? ", " + addr.state : ""}.`,
        link:    `/rider/orders`,
      });
    } catch (notifyErr) {
      console.error("[assign] rider notification failed (non-fatal):", notifyErr.message);
    }

    const riderName = [rider.first_name, rider.last_name].filter(Boolean).join(" ") || "Rider";

    return NextResponse.json({
      success: true,
      rider: {
        id:    rider.id,
        name:  riderName,
        phone: rider.phone,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/logistics/orders/[id]/assign]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
