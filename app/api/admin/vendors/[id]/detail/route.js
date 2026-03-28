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

export async function GET(request, { params }) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // ── Step 1: Vendor row (no cross-schema join — vendors.id FK is to auth.users, not public.users)
    const { data: vendor, error: vErr } = await ctx.admin
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (vErr || !vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    // ── Step 2: User profile from public.users (vendors.id === users.id)
    const { data: userRow } = await ctx.admin
      .from("users")
      .select("id, email, phone, wallet_balance, pod_refused_count, pod_blacklisted, created_at")
      .eq("id", id)
      .single();

    // ── Step 3: Product counts by status
    const { data: productRows } = await ctx.admin
      .from("products")
      .select("status")
      .eq("vendor_id", id);

    const products = {
      total:    productRows?.length ?? 0,
      active:   productRows?.filter((p) => p.status === "active").length   ?? 0,
      draft:    productRows?.filter((p) => p.status === "draft").length    ?? 0,
      inactive: productRows?.filter((p) => p.status === "inactive").length ?? 0,
    };

    // ── Step 4: Order stats via order_items (vendor_id column)
    const { data: orderItems } = await ctx.admin
      .from("order_items")
      .select("id, order_id, total")
      .eq("vendor_id", id);

    const orderIds = [...new Set((orderItems ?? []).map((i) => i.order_id).filter(Boolean))];

    let ordersMap = {};
    if (orderIds.length > 0) {
      const { data: orderRows } = await ctx.admin
        .from("orders")
        .select("id, status, created_at, customer_id")
        .in("id", orderIds);
      ordersMap = Object.fromEntries((orderRows ?? []).map((o) => [o.id, o]));
    }

    const completedStatuses = new Set(["delivered", "shipped", "confirmed"]);
    const totalRevenue = (orderItems ?? [])
      .filter((i) => completedStatuses.has(ordersMap[i.order_id]?.status))
      .reduce((s, i) => s + (i.total ?? 0), 0);

    const stats = {
      totalOrders:   orderIds.length,
      totalRevenue,
      pendingOrders: Object.values(ordersMap).filter((o) => o.status === "pending").length,
    };

    // ── Step 5: Recent 5 orders with customer info
    const recentOrderIds = Object.values(ordersMap)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((o) => o.id);

    let customerMap = {};
    if (recentOrderIds.length > 0) {
      const customerIds = [...new Set(
        recentOrderIds.map((oid) => ordersMap[oid]?.customer_id).filter(Boolean)
      )];
      if (customerIds.length > 0) {
        const { data: customers } = await ctx.admin
          .from("users")
          .select("id, email")
          .in("id", customerIds);
        customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, c]));
      }
    }

    const recentOrders = recentOrderIds.map((oid) => {
      const o   = ordersMap[oid];
      const rev = (orderItems ?? []).filter((i) => i.order_id === oid).reduce((s, i) => s + (i.total ?? 0), 0);
      return {
        orderId:  oid,
        status:   o?.status,
        total:    rev,
        customer: customerMap[o?.customer_id]?.email ?? "—",
        date:     o?.created_at
          ? new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
          : null,
      };
    });

    // ── Step 6: Recent wallet transactions
    const { data: txns } = await ctx.admin
      .from("wallet_transactions")
      .select("type, amount, description, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      vendor: {
        id,
        businessName:        vendor.business_name,
        businessAddress:     vendor.address,
        city:                vendor.city,
        state:               vendor.state,
        cacNumber:           vendor.cac_number,
        ninVerified:         vendor.nin_verified,
        cacVerified:         vendor.cac_verified,
        verificationStatus:  vendor.verification_status,
        subscriptionTier:    vendor.subscription_tier,
        bankAccountNumber:   vendor.bank_account_number,
        bankCode:            vendor.bank_code,
        bankName:            vendor.bank_name,
        createdAt:           vendor.created_at,
        user: {
          id,
          email:           userRow?.email ?? null,
          phone:           userRow?.phone ?? null,
          walletBalance:   userRow?.wallet_balance ?? 0,
          podRefusedCount: userRow?.pod_refused_count ?? 0,
          podBlacklisted:  userRow?.pod_blacklisted ?? false,
          joinedAt:        userRow?.created_at
            ? new Date(userRow.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
            : null,
        },
      },
      products,
      stats,
      recentOrders,
      recentTransactions: (txns ?? []).map((t) => ({
        type:        t.type,
        amount:      t.amount,
        description: t.description,
        date:        new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      })),
    });
  } catch (error) {
    console.error("[admin/vendors/detail]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
