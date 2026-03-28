import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 25;

    let query = admin
      .from("orders")
      .select("id, customer_id, status, total, created_at, delivery_address", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq("status", status);

    const { data: orderRows, error: qErr, count } = await query;
    if (qErr) throw qErr;

    // Bulk-fetch customer emails from public.users
    const customerIds = [...new Set((orderRows ?? []).map((o) => o.customer_id).filter(Boolean))];
    let customerMap = {};
    if (customerIds.length > 0) {
      const { data: customers } = await admin
        .from("users")
        .select("id, email, phone")
        .in("id", customerIds);
      customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, c]));
    }

    const orders = (orderRows || []).map((o) => {
      const c = customerMap[o.customer_id];
      return {
        id:         o.id,
        customerId: o.customer_id,
        shortId:    `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        status:     o.status,
        total:      o.total,
        customer:   c?.email ?? "Unknown",
        phone:      c?.phone ?? o.delivery_address?.phone ?? null,
        city:       o.delivery_address?.city ?? "—",
        date:       new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    return NextResponse.json({ orders, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit), page });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
