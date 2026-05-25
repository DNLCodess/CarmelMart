import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Step 1: get all order_items for this vendor
    const { data: items, error: qErr } = await admin
      .from("order_items")
      .select("order_id, quantity, unit_price, total")
      .eq("vendor_id", user.id);

    if (qErr) throw qErr;

    const orderIds = [...new Set((items ?? []).map((i) => i.order_id).filter(Boolean))];
    if (orderIds.length === 0) return NextResponse.json({ customers: [], total: 0 });

    // Step 2: fetch orders (exclude cancelled)
    const { data: orderRows } = await admin
      .from("orders")
      .select("id, customer_id, created_at, status")
      .in("id", orderIds)
      .neq("status", "cancelled");

    // Step 3: bulk-fetch customer info
    const customerIds = [...new Set((orderRows ?? []).map((o) => o.customer_id).filter(Boolean))];
    let userInfoMap = {};
    if (customerIds.length > 0) {
      const { data: users } = await admin
        .from("users").select("id, first_name, last_name, email, phone").in("id", customerIds);
      userInfoMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    }

    const orderMap = Object.fromEntries((orderRows ?? []).map((o) => [o.id, o]));

    // Group by customer
    const customerMap = {};
    (items || []).forEach((item) => {
      const order = orderMap[item.order_id];
      if (!order) return;
      const cId = order.customer_id;
      if (!cId) return;

      if (!customerMap[cId]) {
        const u = userInfoMap[cId] ?? {};
        customerMap[cId] = {
          id:          cId,
          name:        [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Customer",
          email:       u.email ?? null,
          phone:       u.phone ?? null,
          totalOrders: new Set(),
          totalSpent:  0,
          lastOrderAt: null,
        };
      }

      const c = customerMap[cId];
      c.totalOrders.add(order.id);
      c.totalSpent += item.total ?? (item.unit_price * item.quantity);
      if (!c.lastOrderAt || order.created_at > c.lastOrderAt) {
        c.lastOrderAt = order.created_at;
      }
    });

    const customers = Object.values(customerMap).map((c) => ({
      id:          c.id,
      name:        c.name,
      email:       c.email,
      phone:       c.phone,
      totalOrders: c.totalOrders.size,
      totalSpent:  c.totalSpent,
      lastOrderAt: c.lastOrderAt
        ? new Date(c.lastOrderAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : null,
    }));

    // Sort by totalSpent desc
    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({ customers, total: customers.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
