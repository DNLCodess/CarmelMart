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

    // Revenue (30d) — sum of order_items totals where vendor_id = user.id
    const { data: revenueData } = await admin
      .from("order_items")
      .select("total, created_at")
      .eq("vendor_id", user.id)
      .gte("created_at", thirtyDaysAgo);

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

    // Total orders
    const { count: ordersCount } = await admin
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", user.id);

    // Pending orders for THIS vendor
    const { data: vendorPendingData } = await admin
      .from("order_items")
      .select("order_id, orders!inner(id, status)")
      .eq("vendor_id", user.id)
      .eq("orders.status", "pending");
    const pendingCount = new Set((vendorPendingData || []).map((r) => r.order_id)).size;

    // Products count
    const { count: productsCount } = await admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .eq("status", "active");

    // Unique customers
    const { data: customerData } = await admin
      .from("order_items")
      .select("orders!inner(customer_id)")
      .eq("vendor_id", user.id);

    const uniqueCustomers = new Set((customerData || []).map((r) => r.orders?.customer_id)).size;

    // Recent 5 orders
    const { data: recentOrdersRaw } = await admin
      .from("orders")
      .select(`
        id, status, total, created_at,
        users!customer_id ( user_metadata ),
        order_items!inner ( vendor_id )
      `)
      .eq("order_items.vendor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentOrders = (recentOrdersRaw || []).map((o) => ({
      id:       o.id.slice(0, 13).toUpperCase(),
      customer: o.users?.user_metadata?.full_name ?? "Customer",
      amount:   o.total,
      status:   o.status,
      date:     new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
    }));

    // Top products
    const { data: topProdData } = await admin
      .from("products")
      .select("id, name, images, sold_count, price")
      .eq("vendor_id", user.id)
      .order("sold_count", { ascending: false })
      .limit(5);

    const topProducts = (topProdData || []).map((p) => ({
      name:    p.name,
      image:   Array.isArray(p.images) ? p.images[0] : null,
      sold:    p.sold_count,
      revenue: p.sold_count * p.price,
    }));

    // Wallet balance
    const { data: walletData } = await admin
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    // To-Do: low stock products (stock ≤ 5)
    const { data: lowStockData } = await admin
      .from("products")
      .select("id, name, stock")
      .eq("vendor_id", user.id)
      .eq("status", "active")
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(5);

    // To-Do: products pending moderation review
    const { count: pendingModerationCount } = await admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .eq("moderation_status", "pending");

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
        orders: ordersCount ?? 0,
        pending_orders: pendingCount ?? 0,
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
