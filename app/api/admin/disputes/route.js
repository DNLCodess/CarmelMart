import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return { user, admin };
}

export async function GET(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 20;

    let query = ctx.admin
      .from("disputes")
      .select("id, reason, description, status, resolution, created_at, order_id, raised_by, vendor_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq("status", status);

    const { data: disputeRows, error, count } = await query;
    if (error) throw error;

    // Collect IDs for bulk fetches
    const orderIds    = [...new Set((disputeRows ?? []).map((d) => d.order_id).filter(Boolean))];
    const userIds     = [...new Set([
      ...(disputeRows ?? []).map((d) => d.raised_by),
      ...(disputeRows ?? []).map((d) => d.vendor_id),
    ].filter(Boolean))];

    const [orderMap, userMap, vendorMap] = await Promise.all([
      orderIds.length > 0
        ? ctx.admin.from("orders").select("id, total, status").in("id", orderIds)
            .then(({ data }) => Object.fromEntries((data ?? []).map((o) => [o.id, o])))
        : Promise.resolve({}),
      userIds.length > 0
        ? ctx.admin.from("users").select("id, email").in("id", userIds)
            .then(({ data }) => Object.fromEntries((data ?? []).map((u) => [u.id, u])))
        : Promise.resolve({}),
      userIds.length > 0
        ? ctx.admin.from("vendors").select("id, business_name").in("id", userIds)
            .then(({ data }) => Object.fromEntries((data ?? []).map((v) => [v.id, v])))
        : Promise.resolve({}),
    ]);

    const disputes = (disputeRows || []).map((d) => {
      const order    = orderMap[d.order_id];
      const customer = userMap[d.raised_by];
      const vendorU  = userMap[d.vendor_id];
      const vendorV  = vendorMap[d.vendor_id];
      return {
        id:          d.id,
        reason:      d.reason,
        description: d.description,
        status:      d.status,
        resolution:  d.resolution,
        date:        new Date(d.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        order: order ? {
          id:      order.id,
          shortId: `#CM-${order.id.slice(0, 8).toUpperCase()}`,
          total:   order.total,
          status:  order.status,
        } : null,
        customer: {
          id:    d.raised_by,
          email: customer?.email ?? "Customer",
          name:  customer?.email ?? "Customer",
        },
        vendor: {
          id:           d.vendor_id,
          email:        vendorU?.email ?? null,
          businessName: vendorV?.business_name ?? vendorU?.email ?? "Vendor",
        },
      };
    });

    return NextResponse.json({
      disputes,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
      page,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
