import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVendorPayoutProcessed } from "@/lib/email";

async function authorise() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["accountant", "admin"].includes(profile.role)) return null;
  return { user, admin };
}

// GET /api/accountant/payouts — full payout history with filters
export async function GET(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range  = searchParams.get("range")  || "30d";
    const status = searchParams.get("status") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 30;

    const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
    const days    = daysMap[range];
    const since   = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

    let q = ctx.admin
      .from("vendor_payouts")
      .select(
        "id, vendor_id, amount, status, reference, bank_name, bank_account, bank_account_name, error, resolved_at, resolved_by, transfer_reference, notes, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (since)  q = q.gte("created_at", since);
    if (status) q = q.eq("status", status);

    const { data: rows, count, error: qErr } = await q;
    if (qErr) throw qErr;

    // Resolve vendor + resolver names
    const vendorIds   = [...new Set((rows || []).map((r) => r.vendor_id).filter(Boolean))];
    const resolverIds = [...new Set((rows || []).map((r) => r.resolved_by).filter(Boolean))];
    const allIds      = [...new Set([...vendorIds, ...resolverIds])];

    let vendorMap   = {};
    let resolverMap = {};

    if (allIds.length) {
      const { data: users } = await ctx.admin
        .from("users")
        .select("id, email, first_name, last_name")
        .in("id", allIds);

      const uMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
      for (const id of vendorIds)   vendorMap[id]   = uMap[id];
      for (const id of resolverIds) resolverMap[id] = uMap[id]
        ? ([uMap[id].first_name, uMap[id].last_name].filter(Boolean).join(" ") || uMap[id].email)
        : null;
    }

    const payouts = (rows || []).map((r) => {
      const v = vendorMap[r.vendor_id];
      const vendorName = v ? ([v.first_name, v.last_name].filter(Boolean).join(" ") || v.email) : "Unknown";
      return {
        id:                r.id,
        vendor:            vendorName,
        vendorEmail:       v?.email ?? null,
        vendorId:          r.vendor_id,
        amount:            r.amount ?? 0,
        status:            r.status,
        reference:         r.reference         ?? null,
        bankName:          r.bank_name          ?? "—",
        bankAccount:       r.bank_account       ?? "—",
        accountName:       r.bank_account_name  ?? "—",
        error:             r.error              ?? null,
        resolvedAt:        r.resolved_at        ?? null,
        resolvedBy:        r.resolved_by ? (resolverMap[r.resolved_by] ?? null) : null,
        transferReference: r.transfer_reference ?? null,
        notes:             r.notes              ?? null,
        resolvedAtLabel:   r.resolved_at
          ? new Date(r.resolved_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : null,
        date: new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    const totalCompleted = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const totalPending   = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const totalFailed    = payouts.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      payouts,
      summary:    { totalCompleted, totalPending, totalFailed },
      pagination: { page, pages: Math.ceil((count ?? 0) / limit), total: count ?? 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/accountant/payouts — manually resolve a payout
// Body: { payoutId, action: "complete"|"reject", transferReference?, notes?, sendEmail? }
export async function POST(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { payoutId, action, transferReference, notes, sendEmail } = await request.json();

    if (!payoutId)                                    return NextResponse.json({ error: "payoutId required" }, { status: 400 });
    if (!["complete", "reject"].includes(action))     return NextResponse.json({ error: "action must be complete or reject" }, { status: 400 });
    if (action === "complete" && !transferReference?.trim())
      return NextResponse.json({ error: "transferReference is required when completing a payout" }, { status: 400 });

    const { data: payout, error: fetchErr } = await ctx.admin
      .from("vendor_payouts")
      .select("id, vendor_id, amount, status, reference, bank_name, bank_account")
      .eq("id", payoutId)
      .single();

    if (fetchErr || !payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (payout.status !== "pending")
      return NextResponse.json({ error: `Payout is already ${payout.status}` }, { status: 400 });

    const now = new Date().toISOString();

    if (action === "complete") {
      await ctx.admin.from("vendor_payouts").update({
        status:             "completed",
        transfer_reference: transferReference.trim(),
        notes:              notes?.trim() || null,
        resolved_at:        now,
        resolved_by:        ctx.user.id,
        updated_at:         now,
      }).eq("id", payoutId);

      if (sendEmail) {
        const [{ data: userRow }, { data: vendorRow }] = await Promise.all([
          ctx.admin.from("users").select("email, first_name, last_name").eq("id", payout.vendor_id).single(),
          ctx.admin.from("vendors").select("business_name").eq("id", payout.vendor_id).single(),
        ]);

        if (userRow?.email) {
          const vendorName = vendorRow?.business_name
            || [userRow.first_name, userRow.last_name].filter(Boolean).join(" ")
            || userRow.email;

          await sendVendorPayoutProcessed({
            to:        userRow.email,
            vendorName,
            amount:    payout.amount,
            reference: transferReference.trim(),
          }).catch((err) => console.error("[accountant/payouts] email send failed:", err));
        }
      }

      return NextResponse.json({ success: true, status: "completed" });
    }

    // action === "reject" — refund vendor's wallet
    await ctx.admin.from("vendor_payouts").update({
      status:      "failed",
      notes:       notes?.trim() || null,
      resolved_at: now,
      resolved_by: ctx.user.id,
      updated_at:  now,
    }).eq("id", payoutId);

    await ctx.admin.rpc("increment_wallet", {
      p_user_id: payout.vendor_id,
      p_amount:  payout.amount,
    }).catch(async () => {
      const { data: u } = await ctx.admin.from("users").select("wallet_balance").eq("id", payout.vendor_id).single();
      await ctx.admin.from("users").update({ wallet_balance: (u?.wallet_balance ?? 0) + payout.amount }).eq("id", payout.vendor_id);
    });

    await ctx.admin.from("wallet_transactions").insert({
      user_id:     payout.vendor_id,
      type:        "credit",
      amount:      payout.amount,
      description: `Withdrawal rejected — refund for ${payout.reference}`,
      reference:   payout.reference,
    });

    return NextResponse.json({ success: true, status: "failed" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
