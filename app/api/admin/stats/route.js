import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now           = new Date();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixMonthsAgo    = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: newUsers },
      { count: totalVendors },
      { count: pendingKyc },
      { count: totalProducts },
      { count: totalOrders },
      { count: pendingOrders },
      { count: openDisputes },
      { data: revenueData },
      { data: chartData },
      { data: regData },
      { data: catItemData },
      { data: recentOrderData },
      { data: recentVendorData },
      { data: stateOrderData },
    ] = await Promise.all([
      admin.from("users").select("*", { count: "exact", head: true }),
      admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      admin.from("users").select("*", { count: "exact", head: true }).eq("role", "vendor"),
      admin.from("vendors").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
      admin.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
      admin.from("orders").select("*", { count: "exact", head: true }),
      admin.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "disputed").catch(() => ({ count: 0 })),
      admin.from("payments").select("amount").eq("status", "completed").gte("created_at", thirtyDaysAgo),
      admin.from("payments").select("amount, created_at").eq("status", "completed").gte("created_at", sixMonthsAgo),
      // New: 14-day registrations
      admin.from("users").select("created_at").gte("created_at", fourteenDaysAgo),
      // New: category GMV (last 30 days)
      admin.from("order_items")
        .select("total, products!product_id(categories!category_id(id, name))")
        .gte("created_at", thirtyDaysAgo),
      // New: recent orders for activity feed
      admin.from("orders")
        .select("id, status, total, created_at, users!customer_id(first_name, last_name, email)")
        .order("created_at", { ascending: false })
        .limit(6),
      // New: recent vendor signups
      admin.from("vendors")
        .select("id, business_name, verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      // New: orders grouped by state (last 30 days via delivery_address JSONB)
      admin.from("orders")
        .select("delivery_address, total")
        .gte("created_at", thirtyDaysAgo)
        .not("delivery_address", "is", null),
    ]);

    const gmv = (revenueData || []).reduce((s, p) => s + (p.amount || 0), 0);

    // 6-month revenue chart grouped by month
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = { month: d.toLocaleString("en-NG", { month: "short" }), revenue: 0 };
    }
    for (const p of chartData || []) {
      const key = p.created_at.slice(0, 7);
      if (monthMap[key]) monthMap[key].revenue += p.amount || 0;
    }
    const revenueChart = Object.values(monthMap);

    // 14-day registrations chart grouped by day
    const regDayMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      regDayMap[key] = {
        day: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
        count: 0,
      };
    }
    for (const u of regData || []) {
      const key = u.created_at.slice(0, 10);
      if (regDayMap[key]) regDayMap[key].count++;
    }
    const registrationsChart = Object.values(regDayMap);

    // Top categories by GMV
    const catRevMap = {};
    for (const item of catItemData || []) {
      const cat = item.products?.categories;
      if (!cat?.id) continue;
      if (!catRevMap[cat.id]) catRevMap[cat.id] = { name: cat.name, revenue: 0, orders: 0 };
      catRevMap[cat.id].revenue += item.total || 0;
      catRevMap[cat.id].orders++;
    }
    const topCategories = Object.values(catRevMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent activity feed (merge orders + vendor signups)
    const actOrders = (recentOrderData || []).map((o) => ({
      type:    "order",
      id:      o.id,
      title:   `Order #${String(o.id).slice(0, 8).toUpperCase()}`,
      sub:     [o.users?.first_name, o.users?.last_name].filter(Boolean).join(" ") || o.users?.email || "Guest",
      amount:  o.total,
      status:  o.status,
      timeAgo: timeAgo(o.created_at),
      time:    o.created_at,
    }));
    const actVendors = (recentVendorData || []).map((v) => ({
      type:    "vendor",
      id:      v.id,
      title:   v.business_name || "New vendor",
      sub:     `KYC: ${v.verification_status}`,
      status:  v.verification_status,
      timeAgo: timeAgo(v.created_at),
      time:    v.created_at,
    }));
    const recentActivity = [...actOrders, ...actVendors]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);

    // Orders by state (top 10)
    const stateMap = {};
    for (const o of stateOrderData || []) {
      const addr = o.delivery_address;
      const state = typeof addr === "object" ? (addr?.state ?? addr?.State ?? null) : null;
      if (!state) continue;
      if (!stateMap[state]) stateMap[state] = { state, orders: 0, revenue: 0 };
      stateMap[state].orders++;
      stateMap[state].revenue += o.total || 0;
    }
    const ordersByState = Object.values(stateMap)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        gmv,
        total_users:    totalUsers    ?? 0,
        new_users_30d:  newUsers      ?? 0,
        vendors:        totalVendors  ?? 0,
        pending_kyc:    pendingKyc    ?? 0,
        products:       totalProducts ?? 0,
        orders:         totalOrders   ?? 0,
        pending_orders: pendingOrders ?? 0,
        open_disputes:  openDisputes  ?? 0,
      },
      revenue_chart:        revenueChart,
      registrations_chart:  registrationsChart,
      top_categories:       topCategories,
      recent_activity:      recentActivity,
      orders_by_state:      ordersByState,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
