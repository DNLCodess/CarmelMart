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

export async function GET(request) {
  try {
    const guard = await guardLogistics();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;

    const { searchParams } = new URL(request.url);
    const status   = searchParams.get("status") || null;
    const assigned = searchParams.get("assigned");    // "yes" | "no"
    const search   = searchParams.get("search") || null;
    const page     = Math.max(1, Number(searchParams.get("page") || 1));
    const limit    = 20;

    let query = admin
      .from("orders")
      .select(
        "id, status, total, payment_method, payment_status, delivery_address, created_at, customer_id, rider_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq("status", status);

    const { data: orderRows, count, error: qErr } = await query;
    if (qErr) throw qErr;

    if (!orderRows?.length) {
      return NextResponse.json({ orders: [], total: 0, pages: 0, page });
    }

    const orderIds    = orderRows.map((o) => o.id);
    const customerIds = [...new Set(orderRows.map((o) => o.customer_id).filter(Boolean))];
    const riderIds    = [...new Set(orderRows.map((o) => o.rider_id).filter(Boolean))];

    // Bulk-fetch customer info
    const { data: customers } = await admin
      .from("users")
      .select("id, email, first_name, last_name, phone")
      .in("id", customerIds);
    const customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, c]));

    // Bulk-fetch rider info
    const riderMap = {};
    if (riderIds.length) {
      const { data: riders } = await admin
        .from("users")
        .select("id, first_name, last_name, phone")
        .in("id", riderIds);
      for (const r of riders ?? []) {
        riderMap[r.id] = {
          id:    r.id,
          name:  [r.first_name, r.last_name].filter(Boolean).join(" ") || "Rider",
          phone: r.phone ?? "",
        };
      }
    }

    let orders = orderRows.map((o) => {
      const c    = customerMap[o.customer_id] ?? {};
      const addr = o.delivery_address ?? {};
      const rider = o.rider_id ? (riderMap[o.rider_id] ?? null) : null;
      return {
        id:             o.id,
        shortId:        `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        status:         o.status,
        total:          o.total,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        rider_id:       o.rider_id ?? null,
        customer: {
          id:    o.customer_id,
          name:  [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown",
          email: c.email ?? null,
          phone: c.phone ?? addr.phone ?? null,
        },
        delivery_address: addr,
        city:       addr.city ?? "—",
        state:      addr.state ?? "—",
        date:       new Date(o.created_at).toLocaleDateString("en-NG", {
          day: "numeric", month: "short", year: "numeric",
        }),
        created_at: o.created_at,
        assignment: rider ? { rider, rider_id: o.rider_id } : null,
      };
    });

    // Filter by assignment status
    if (assigned === "yes") orders = orders.filter((o) => o.rider_id);
    if (assigned === "no")  orders = orders.filter((o) => !o.rider_id);

    // Search by customer name, email, order ID, phone
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.shortId.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          (o.customer.email ?? "").toLowerCase().includes(q) ||
          (o.customer.phone ?? "").includes(q)
      );
    }

    return NextResponse.json({
      orders,
      total:  count ?? orders.length,
      pages:  Math.ceil((count ?? orders.length) / limit),
      page,
    });
  } catch (error) {
    console.error("[GET /api/logistics/orders]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
