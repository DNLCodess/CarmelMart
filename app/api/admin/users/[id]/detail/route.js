import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: me } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Core profile
    const { data: profile } = await admin
      .from("users")
      .select("id, email, phone, role, status, wallet_balance, referral_code, avatar_url, first_name, last_name, created_at")
      .eq("id", id)
      .single();

    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Orders
    const { data: orders } = await admin
      .from("orders")
      .select("id, status, total, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Payments
    const { data: payments } = await admin
      .from("payments")
      .select("id, reference, amount, type, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Referrals (as referrer)
    const { data: referrals } = await admin
      .from("referrals")
      .select("id, status, created_at, referred:users!referred_id(email, first_name, last_name)")
      .eq("referrer_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Vendor profile if applicable
    const { data: vendorProfile } = await admin
      .from("vendors")
      .select("business_name, verification_status, nin_verified, cac_verified, bank_account_number, bank_name")
      .eq("id", id)
      .maybeSingle();

    const totalOrderValue = (orders || [])
      .filter((o) => !["cancelled", "refunded"].includes(o.status))
      .reduce((sum, o) => sum + (o.total ?? 0), 0);

    return NextResponse.json({
      user: {
        id:            profile.id,
        email:         profile.email,
        phone:         profile.phone,
        role:          profile.role,
        status:        profile.status ?? "active",
        walletBalance: profile.wallet_balance ?? 0,
        referralCode:  profile.referral_code,
        avatarUrl:     profile.avatar_url,
        name:          [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
        createdAt:     new Date(profile.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
        stats: {
          totalOrders: (orders || []).length,
          totalSpent:  totalOrderValue,
          totalPaid:   (payments || []).filter((p) => p.status === "completed").reduce((s, p) => s + (p.amount ?? 0), 0),
          referralsMade: (referrals || []).length,
        },
      },
      vendor: vendorProfile ?? null,
      orders: (orders || []).map((o) => ({
        id:      o.id,
        shortId: `#CM-${o.id.slice(0, 8).toUpperCase()}`,
        status:  o.status,
        total:   o.total,
        date:    new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      })),
      payments: (payments || []).map((p) => ({
        id:        p.id,
        reference: p.reference,
        amount:    p.amount,
        type:      p.type,
        status:    p.status,
        date:      new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      })),
      referrals: (referrals || []).map((r) => ({
        id:     r.id,
        status: r.status,
        name:   [r.referred?.first_name, r.referred?.last_name].filter(Boolean).join(" ") || r.referred?.email || "Unknown",
        email:  r.referred?.email,
        date:   new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
