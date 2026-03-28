import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/customer/orders/[id] — full order detail for the authenticated customer
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(`
        id, status, total, pod_deposit, payment_method, payment_status,
        payment_ref, delivery_address, notes, created_at,
        order_items (
          id, quantity, unit_price, total,
          products ( id, name, images, slug )
        )
      `)
      .eq("id", id)
      .eq("customer_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const addr = order.delivery_address ?? {};

    // Build a status-driven tracking timeline
    const STATUS_STEPS = [
      { key: "placed",    label: "Order Placed"       },
      { key: "confirmed", label: "Payment Confirmed"  },
      { key: "processing",label: "Being Packed"       },
      { key: "shipped",   label: "Out for Delivery"   },
      { key: "delivered", label: "Delivered"          },
    ];

    const statusIndex = {
      pending:    0,
      confirmed:  1,
      processing: 2,
      shipped:    3,
      delivered:  4,
      cancelled:  -1,
      refunded:   -1,
    };

    const currentIdx = statusIndex[order.status] ?? 0;

    const tracking = STATUS_STEPS.map((step, i) => ({
      label: step.label,
      done:  order.status === "cancelled" ? false : i <= currentIdx,
    }));

    return NextResponse.json({
      order: {
        id:             order.id,
        shortId:        `#CM-${order.id.slice(0, 8).toUpperCase()}`,
        status:         order.status,
        total:          order.total,
        pod_deposit:    order.pod_deposit,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        payment_ref:    order.payment_ref,
        date:           order.created_at,
        address:        addr,
        delivery_method: addr.delivery_method ?? "standard",
        delivery_fee:   addr.delivery_fee ?? 0,
        tracking,
        items: (order.order_items ?? []).map((it) => ({
          id:         it.id,
          product_id: it.products?.id ?? null,
          name:       it.products?.name ?? "Product",
          slug:       it.products?.slug ?? null,
          image:      it.products?.images?.[0] ?? null,
          quantity:   it.quantity,
          price:      it.unit_price,
          total:      it.total ?? it.unit_price * it.quantity,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
