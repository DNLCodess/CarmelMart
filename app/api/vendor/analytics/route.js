import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Group an array of { created_at, total } records into time buckets
function groupByDay(items, days) {
  const buckets = {};
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    if (days <= 7) {
      buckets[key] = { label: DAY_NAMES[d.getDay()], revenue: 0, orders: 0 };
    } else if (days <= 30) {
      const week = Math.floor(i / 7);
      const wKey = `week-${week}`;
      if (!buckets[wKey]) buckets[wKey] = { label: `W${Math.ceil(days / 7) - week}`, revenue: 0, orders: 0, _keys: [] };
      buckets[wKey]._keys.push(key);
    } else {
      const mo = d.toLocaleString("en-NG", { month: "short" });
      const moKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[moKey]) buckets[moKey] = { label: mo, revenue: 0, orders: 0, _keys: [] };
      buckets[moKey]._keys.push(key);
    }
  }

  // For weekly/monthly buckets, build a lookup from individual day key → bucket key
  const dayToBucket = {};
  if (days > 7) {
    for (const [bKey, bucket] of Object.entries(buckets)) {
      for (const dk of bucket._keys ?? []) dayToBucket[dk] = bKey;
    }
  }

  for (const item of items) {
    const dayKey = item.created_at.slice(0, 10);
    if (days <= 7) {
      if (buckets[dayKey]) {
        buckets[dayKey].revenue += item.total || 0;
        buckets[dayKey].orders  += 1;
      }
    } else {
      const bKey = dayToBucket[dayKey];
      if (bKey && buckets[bKey]) {
        buckets[bKey].revenue += item.total || 0;
        buckets[bKey].orders  += 1;
      }
    }
  }

  return Object.values(buckets).map(({ label, revenue, orders }) => ({ label, revenue, orders }));
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Analytics is a Premium/VIP benefit — gate free-tier vendors
    const { data: vendor } = await admin.from("vendors").select("subscription_tier").eq("id", user.id).single();
    const tier = vendor?.subscription_tier ?? "free";
    if (tier === "free") {
      return NextResponse.json({ error: "ANALYTICS_GATED", tier: "free" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "7d";
    const days   = period === "90d" ? 90 : period === "30d" ? 30 : 7;
    const since  = new Date(Date.now() - days * 86400000).toISOString();

    // Order items for this vendor in the period
    const { data: items } = await admin
      .from("order_items")
      .select("total, created_at, product_id, quantity")
      .eq("vendor_id", user.id)
      .gte("created_at", since);

    const chart = groupByDay(items || [], days);

    const totalRevenue = (items || []).reduce((s, r) => s + (r.total || 0), 0);
    const totalOrders  = (items || []).length;

    // Top products by revenue in period
    const prodMap = {};
    for (const item of items || []) {
      if (!prodMap[item.product_id]) prodMap[item.product_id] = { revenue: 0, orders: 0 };
      prodMap[item.product_id].revenue += item.total    || 0;
      prodMap[item.product_id].orders  += item.quantity || 1;
    }

    const topProdIds = Object.entries(prodMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id]) => id);

    let topProducts = [];
    if (topProdIds.length > 0) {
      const { data: prods } = await admin
        .from("products")
        .select("id, name")
        .in("id", topProdIds);

      topProducts = topProdIds.map((id) => {
        const p = prods?.find((p) => p.id === id);
        return { name: p?.name ?? "Unknown", ...prodMap[id] };
      });
    }

    return NextResponse.json({ chart, totalRevenue, totalOrders, topProducts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
