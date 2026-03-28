import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Fetch last 5 orders
    const { data: orders } = await admin
      .from("orders")
      .select("id, status, total, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch last 5 reviews
    const { data: reviews } = await admin
      .from("product_reviews")
      .select("id, rating, created_at, products!product_id(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch last 5 referrals (as referrer)
    const { data: referrals } = await admin
      .from("referrals")
      .select("id, status, created_at, referred:users!referred_id(email, first_name)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Merge and sort all events by created_at desc
    const events = [
      ...(orders || []).map((o) => ({
        id:        `order-${o.id}`,
        type:      "order",
        title:     `Order placed`,
        subtitle:  `₦${o.total.toLocaleString()} — ${o.status}`,
        href:      `/orders/${o.id}`,
        timestamp: o.created_at,
      })),
      ...(reviews || []).map((r) => ({
        id:        `review-${r.id}`,
        type:      "review",
        title:     `Reviewed ${r.products?.name ?? "a product"}`,
        subtitle:  `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`,
        href:      null,
        timestamp: r.created_at,
      })),
      ...(referrals || []).map((ref) => ({
        id:        `referral-${ref.id}`,
        type:      "referral",
        title:     `Referred ${ref.referred?.first_name ?? ref.referred?.email ?? "someone"}`,
        subtitle:  ref.status === "completed" ? "Reward credited ✓" : "Pending registration",
        href:      null,
        timestamp: ref.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15)
      .map((e) => ({
        ...e,
        date: new Date(e.timestamp).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        time: new Date(e.timestamp).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
      }));

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
