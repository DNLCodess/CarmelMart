import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// GET /api/logistics/orders/[id] — full order detail for the logistics view
export async function GET(request, { params }) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    // Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Fetch customer
    const { data: customer } = await admin
      .from("users")
      .select("id, email, first_name, last_name, phone")
      .eq("id", order.customer_id)
      .single();

    // Fetch order items + product names
    const { data: items } = await admin
      .from("order_items")
      .select("id, product_id, vendor_id, quantity, unit_price, total, products(name, images)")
      .eq("order_id", id);

    // Fetch vendor info for each item
    const vendorIds = [...new Set((items ?? []).map((i) => i.vendor_id).filter(Boolean))];
    const { data: vendors } = await admin
      .from("vendors")
      .select("id, business_name, phone")
      .in("id", vendorIds);
    const vendorMap = Object.fromEntries((vendors ?? []).map((v) => [v.id, v]));

    // Fetch logistics assignment
    const { data: assignment } = await admin
      .from("order_logistics")
      .select("*, logistics_partners(id, name, contact_name, phone, email)")
      .eq("order_id", id)
      .maybeSingle();

    const normalizedItems = (items ?? []).map((it) => ({
      id:         it.id,
      product_id: it.product_id,
      name:       it.products?.name ?? "Product",
      image:      Array.isArray(it.products?.images) ? it.products.images[0] : null,
      quantity:   it.quantity,
      unit_price: it.unit_price,
      total:      it.total,
      vendor:     vendorMap[it.vendor_id] ?? null,
    }));

    return NextResponse.json({
      order: {
        ...order,
        shortId: `#CM-${order.id.slice(0, 8).toUpperCase()}`,
      },
      customer: customer ?? null,
      items:    normalizedItems,
      assignment: assignment ?? null,
    });
  } catch (error) {
    console.error("[GET /api/logistics/orders/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
