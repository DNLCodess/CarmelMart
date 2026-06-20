import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorise(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["accountant", "admin"].includes(profile.role)) return null;
  return user;
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();
    if (!await authorise(supabase, admin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range  = searchParams.get("range")  || "30d";
    const status = searchParams.get("status") || null; // pending | processing | completed | failed
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 30;

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days    = daysMap[range];
    const since   = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

    let q = admin
      .from("vendor_payouts")
      .select("id, vendor_id, amount, status, reference, flw_ref, bank_name, bank_account, error, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (since)  q = q.gte("created_at", since);
    if (status) q = q.eq("status", status);

    const { data: rows, count, error: qErr } = await q;
    if (qErr) throw qErr;

    // Resolve vendor names
    const vendorIds = [...new Set((rows || []).map((r) => r.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length) {
      const { data: vendors } = await admin
        .from("users").select("id, email, first_name, last_name")
        .in("id", vendorIds);
      vendorMap = Object.fromEntries((vendors || []).map((v) => [v.id, v]));
    }

    const payouts = (rows || []).map((r) => {
      const v = vendorMap[r.vendor_id];
      const vendorName = v ? [v.first_name, v.last_name].filter(Boolean).join(" ") || v.email : "Unknown";
      return {
        id:           r.id,
        vendor:       vendorName,
        vendorEmail:  v?.email ?? null,
        amount:       r.amount ?? 0,
        status:       r.status,
        reference:    r.reference ?? null,
        flwRef:       r.flw_ref   ?? null,
        bankName:     r.bank_name    ?? "—",
        bankAccount:  r.bank_account ?? "—",
        error:        r.error ?? null,
        date:         new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    const totalCompleted = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const totalPending   = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const totalFailed    = payouts.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      payouts,
      summary: { totalCompleted, totalPending, totalFailed },
      pagination: { page, pages: Math.ceil((count ?? 0) / limit), total: count ?? 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
