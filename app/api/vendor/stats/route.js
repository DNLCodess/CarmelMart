import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Verify vendor role
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();

    // ── Parallel fetch ────────────────────────────────────────────────────────
    const [
      { data: revenueData },
      { data: orderIdsData },
      { data: vendorPendingData },
      { count: productsCount },
      { data: customerData },
      { data: recentOrdersRaw },
      { data: topItemData },
      { data: walletData },
      { data: lowStockData },
      { count: pendingModerationCount },
    ] = await Promise.all([
      // Revenue: only from paid orders
      admin.from("order_items")
        .select("total, created_at, orders!inner(payment_status)")
        .eq("vendor_id", user.id)
        .eq("orders.payment_status", "paid")
        .gte("created_at", thirtyDaysAgo),
      // Order count: fetch order_ids to deduplicate (items ≠ orders)
      admin.from("order_items").select("order_id").eq("vendor_id", user.id),
      // Pending: include both pending and processing
      admin.from("order_items")
        .select("order_id, orders!inner(id, status)")
        .eq("vendor_id", user.id)
        .in("orders.status", ["pending", "processing"]),
      admin.from("products").select("*", { count: "exact", head: true }).eq("vendor_id", user.id).eq("status", "active"),
      admin.from("order_items").select("orders!inner(customer_id)").eq("vendor_id", user.id),
      admin.from("orders")
        .select("id, status, total, created_at, users!customer_id(first_name, last_name, email), order_items!inner(vendor_id)")
        .eq("order_items.vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      // Top products: use actual revenue from order_items instead of estimated sold_count * price
      admin.from("order_items")
        .select("product_id, total, quantity, products!inner(id, name, images, price)")
        .eq("vendor_id", user.id),
      admin.from("users").select("wallet_balance").eq("id", user.id).single(),
      admin.from("products").select("id, name, stock").eq("vendor_id", user.id).eq("status", "active").lte("stock", 5).order("stock", { ascending: true }).limit(5),
      admin.from("products").select("*", { count: "exact", head: true }).eq("vendor_id", user.id).eq("moderation_status", "pending"),
    ]);

    const revenue = (revenueData || []).reduce((sum, r) => sum + (r.total || 0), 0);

    // 7-day revenue chart — group by day
    const last7 = (revenueData || []).filter((r) => r.created_at >= sevenDaysAgo);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      chartMap[key] = { day: dayNames[d.getDay()], revenue: 0 };
    }
    for (const r of last7) {
      const key = r.created_at.slice(0, 10);
      if (chartMap[key]) chartMap[key].revenue += r.total || 0;
    }
    const revenueChart = Object.values(chartMap);

    // Distinct order count (order_items rows != orders)
    const ordersCount = new Set((orderIdsData || []).map((r) => r.order_id)).size;
    const pendingCount = new Set((vendorPendingData || []).map((r) => r.order_id)).size;
    const uniqueCustomers = new Set((customerData || []).map((r) => r.orders?.customer_id)).size;

    const recentOrders = (recentOrdersRaw || []).map((o) => ({
      id:       o.id,
      customer: [o.users?.first_name, o.users?.last_name].filter(Boolean).join(" ") || o.users?.email || "Customer",
      amount:   o.total,
      status:   o.status,
      date:     new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
    }));

    // Top products: actual revenue from order_items, not estimated sold_count * price
    const productRevMap = {};
    for (const item of topItemData || []) {
      const p = item.products;
      if (!p?.id) continue;
      if (!productRevMap[p.id]) {
        productRevMap[p.id] = {
          id:      p.id,
          name:    p.name,
          image:   Array.isArray(p.images) ? p.images[0] : null,
          sold:    0,
          revenue: 0,
        };
      }
      productRevMap[p.id].sold    += item.quantity || 1;
      productRevMap[p.id].revenue += item.total    || 0;
    }
    const topProducts = Object.values(productRevMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const todos = [];
    if (pendingCount > 0) {
      todos.push({ type: "pending_orders", label: `${pendingCount} order${pendingCount > 1 ? "s" : ""} awaiting confirmation`, href: "/vendor/orders", urgency: "high" });
    }
    (lowStockData || []).forEach((p) => {
      todos.push({ type: "low_stock", label: `"${p.name}" is low on stock (${p.stock} left)`, href: `/vendor/products/${p.id}/edit`, urgency: p.stock === 0 ? "high" : "medium" });
    });
    if (pendingModerationCount > 0) {
      todos.push({ type: "moderation", label: `${pendingModerationCount} product${pendingModerationCount > 1 ? "s" : ""} pending admin review`, href: "/vendor/products", urgency: "low" });
    }

    return NextResponse.json({
      stats: {
        revenue, revenue_change: null,
        orders: ordersCount,
        pending_orders: pendingCount,
        products: productsCount ?? 0,
        customers: uniqueCustomers, customers_change: null,
        wallet_balance: walletData?.wallet_balance ?? 0,
      },
      revenue_chart:  revenueChart,
      recent_orders:  recentOrders,
      top_products:   topProducts,
      todos,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
