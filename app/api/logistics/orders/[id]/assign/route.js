import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLogisticsAssignment } from "@/lib/email";

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
 * Body: { partner_id, send_email?: boolean, send_whatsapp_flag?: boolean, notes? }
 *
 * - Assigns the logistics partner to the order
 * - Optionally sends an email to the partner with order details
 * - Returns a whatsapp_url the frontend can open in a new tab
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin, profile } = guard;
    const { id: orderId } = await params;

    const body = await request.json();
    const { partner_id, send_email = true, notes } = body;

    if (!partner_id) {
      return NextResponse.json({ error: "partner_id is required." }, { status: 400 });
    }

    // Verify order exists
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
        { error: `Cannot assign partner to a ${order.status} order.` },
        { status: 400 }
      );
    }

    // Verify partner exists and is active
    const { data: partner, error: partnerErr } = await admin
      .from("logistics_partners")
      .select("id, name, contact_name, phone, email, active")
      .eq("id", partner_id)
      .single();
    if (partnerErr || !partner) {
      return NextResponse.json({ error: "Logistics partner not found." }, { status: 404 });
    }
    if (!partner.active) {
      return NextResponse.json({ error: "This logistics partner is inactive." }, { status: 400 });
    }

    // Fetch order items for the email
    const { data: items } = await admin
      .from("order_items")
      .select("id, quantity, unit_price, total, products(name)")
      .eq("order_id", orderId);

    const normalizedItems = (items ?? []).map((it) => ({
      name:       it.products?.name ?? "Product",
      quantity:   it.quantity,
      unit_price: it.unit_price,
      total:      it.total,
    }));

    const now = new Date().toISOString();

    // Upsert order_logistics record
    const { data: assignment, error: assignErr } = await admin
      .from("order_logistics")
      .upsert(
        {
          order_id:    orderId,
          partner_id,
          assigned_by: user.id,
          assigned_at: now,
          notes:       notes?.trim() ?? null,
          updated_at:  now,
        },
        { onConflict: "order_id" }
      )
      .select("*, logistics_partners(id, name, contact_name, phone, email)")
      .single();

    if (assignErr) throw assignErr;

    // Auto-progress order status to "confirmed" if still pending
    if (order.status === "pending") {
      await admin
        .from("orders")
        .update({ status: "confirmed", updated_at: now })
        .eq("id", orderId);
    }

    // Send email to partner (fire-and-forget)
    let emailSent = false;
    if (send_email && partner.email) {
      try {
        const assignedByName =
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          profile.email;

        await sendLogisticsAssignment({
          to: partner.email,
          partner,
          order,
          items: normalizedItems,
          assignedBy: assignedByName,
        });

        await admin
          .from("order_logistics")
          .update({ email_sent: true, email_sent_at: now, updated_at: now })
          .eq("order_id", orderId);

        emailSent = true;
      } catch (emailErr) {
        console.error("[assign] email failed (non-fatal):", emailErr.message);
      }
    }

    // Build WhatsApp pre-composed message
    const addr = order.delivery_address ?? {};
    const shortId = `#CM-${orderId.slice(0, 8).toUpperCase()}`;
    const itemLines = normalizedItems
      .map((it) => `• ${it.name} ×${it.quantity} (₦${(it.unit_price * it.quantity).toLocaleString("en-NG")})`)
      .join("\n");

    const waMessage = [
      `🚚 *CarmelMart Delivery Assignment*`,
      ``,
      `*Order:* ${shortId}`,
      `*Customer:* ${addr.fullName ?? "—"}`,
      `*Phone:* ${addr.phone ?? "—"}`,
      `*Address:* ${[addr.houseNumber, addr.street].filter(Boolean).join(" ") || "—"}`,
      addr.area ? `*Area:* ${addr.area}` : null,
      `*City:* ${addr.city ?? "—"}, ${addr.state ?? ""}`,
      addr.landmark ? `*Landmark:* ${addr.landmark}` : null,
      addr.delivery_instructions ? `*Note:* ${addr.delivery_instructions}` : null,
      ``,
      `*Items:*`,
      itemLines,
      ``,
      `*Total:* ₦${(order.total ?? 0).toLocaleString("en-NG")}`,
      `*Payment:* ${order.payment_method === "pod" ? "⚠️ Pay on Delivery — collect cash" : "✅ Paid online"}`,
      ``,
      `Please confirm receipt of this assignment and update us on pickup & delivery.`,
      `- CarmelMart Logistics`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    // Normalise phone: WhatsApp requires international format without +
    let waPhone = partner.phone.replace(/\D/g, "");
    if (waPhone.startsWith("0")) waPhone = "234" + waPhone.slice(1);

    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

    return NextResponse.json({
      success:      true,
      assignment,
      email_sent:   emailSent,
      whatsapp_url: whatsappUrl,
    });
  } catch (error) {
    console.error("[PATCH /api/logistics/orders/[id]/assign]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
