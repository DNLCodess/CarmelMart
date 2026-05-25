import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Step 1: get order IDs + quantities for this vendor
    const { data: orderItems } = await admin
      .from("order_items")
      .select("order_id, quantity")
      .eq("vendor_id", user.id);

    const orderIds = [...new Set((orderItems ?? []).map((i) => i.order_id).filter(Boolean))];
    if (orderIds.length === 0) return NextResponse.json({ orders: [] });

    // Step 2: fetch order rows
    const { data: orderRows } = await admin
      .from("orders")
      .select("id, customer_id, status, total, created_at, delivery_address")
      .in("id", orderIds)
      .order("created_at", { ascending: false })
      .limit(50);

    // Step 3: bulk-fetch customer info from public.users
    const customerIds = [...new Set((orderRows ?? []).map((o) => o.customer_id).filter(Boolean))];
    let customerMap = {};
    if (customerIds.length > 0) {
      const { data: customers } = await admin.from("users").select("id, first_name, last_name, email, phone").in("id", customerIds);
      customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, c]));
    }

    // Aggregate item counts per order
    const itemCountMap = {};
    (orderItems ?? []).forEach((i) => { itemCountMap[i.order_id] = (itemCountMap[i.order_id] ?? 0) + i.quantity; });

    const orders = (orderRows ?? []).map((o) => {
      const c    = customerMap[o.customer_id] ?? {};
      const addr = o.delivery_address ?? {};
      return {
        id:               o.id,
        shortId:          `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        customer:         [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Customer",
        phone:            c.phone ?? addr.phone ?? null,
        amount:           o.total,
        status:           o.status,
        date:             new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        items:            itemCountMap[o.id] ?? 0,
        delivery_address: addr,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
