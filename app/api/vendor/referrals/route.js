import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: roleCheck } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!roleCheck || roleCheck.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get referral code + bonus
    const { data: profile } = await admin
      .from("users")
      .select("referral_code, wallet_balance")
      .eq("id", user.id)
      .single();

    // Get all referrals this vendor has made
    const { data: referrals } = await admin
      .from("referrals")
      .select(`
        id, status, created_at,
        referred:users!referred_id ( first_name, last_name, email, role, created_at )
      `)
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    const list = (referrals || []).map((r) => ({
      id:         r.id,
      status:     r.status,
      date:       new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      name:       [r.referred?.first_name, r.referred?.last_name].filter(Boolean).join(" ") || r.referred?.email || "Unknown",
      email:      r.referred?.email ?? null,
      role:       r.referred?.role ?? null,
      joinedDate: r.referred?.created_at
        ? new Date(r.referred.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : null,
    }));

    const completed = list.filter((r) => r.status === "completed").length;
    const pending   = list.filter((r) => r.status === "pending").length;
    const earned    = completed * 500; // ₦500 per completed referral

    return NextResponse.json({
      referralCode: profile?.referral_code ?? null,
      stats: { total: list.length, completed, pending, earned },
      referrals: list,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
