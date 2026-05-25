import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: orderId } = await params;
    const { rider_id } = await request.json();

    // Fetch current order to check status and previous rider
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, rider_id, delivery_address, total, payment_method")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: `Cannot assign a rider to a ${order.status} order.` }, { status: 400 });
    }

    if (rider_id !== null && rider_id !== undefined) {
      const { data: rider } = await admin.from("users").select("role, status").eq("id", rider_id).single();
      if (!rider || rider.role !== "rider") return NextResponse.json({ error: "Invalid rider" }, { status: 400 });
      if (rider.status !== "active") return NextResponse.json({ error: "Rider is not active" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // If assigning a rider and the order is still pending, auto-confirm it
    const statusUpdate = (rider_id && order.status === "pending")
      ? { rider_id: rider_id ?? null, status: "confirmed", updated_at: now }
      : { rider_id: rider_id ?? null, updated_at: now };

    const { error } = await admin
      .from("orders")
      .update(statusUpdate)
      .eq("id", orderId);
    if (error) throw error;

    // Notify the newly assigned rider (fire-and-forget)
    if (rider_id && rider_id !== order.rider_id) {
      try {
        const shortId = `#CM-${orderId.slice(0, 8).toUpperCase()}`;
        const addr    = order.delivery_address ?? {};
        await admin.from("notifications").insert({
          user_id: rider_id,
          type:    "delivery_assigned",
          title:   `New Delivery: ${shortId}`,
          message: `You have been assigned order ${shortId} — ${[addr.city, addr.state].filter(Boolean).join(", ") || "see portal for details"}.`,
          link:    `/rider/orders`,
        });
      } catch (notifyErr) {
        console.error("[admin/orders/assign] rider notification failed (non-fatal):", notifyErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
