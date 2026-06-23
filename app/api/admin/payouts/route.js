import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVendorPayoutProcessed } from "@/lib/email";

async function authorise() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || !["admin", "accountant"].includes(p.role)) return null;
  return { user, admin };
}

// GET /api/admin/payouts — list vendor payout requests (admin + accountant)
export async function GET(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const { data: payoutRows, error } = await ctx.admin
      .from("vendor_payouts")
      .select("id, vendor_id, amount, status, reference, bank_name, bank_account, error, resolved_at, resolved_by, transfer_reference, notes, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const vendorIds    = [...new Set((payoutRows ?? []).map((p) => p.vendor_id).filter(Boolean))];
    const resolverIds  = [...new Set((payoutRows ?? []).map((p) => p.resolved_by).filter(Boolean))];
    const allUserIds   = [...new Set([...vendorIds, ...resolverIds])];

    let vendorInfoMap  = {};
    let resolverMap    = {};

    if (vendorIds.length > 0) {
      const [{ data: vendorRows }, { data: userRows }] = await Promise.all([
        ctx.admin.from("vendors").select("id, business_name, bank_name, bank_account_number, bank_code, subscription_tier").in("id", vendorIds),
        ctx.admin.from("users").select("id, email, first_name, last_name").in("id", allUserIds),
      ]);
      const vMap = Object.fromEntries((vendorRows ?? []).map((v) => [v.id, v]));
      const uMap = Object.fromEntries((userRows  ?? []).map((u) => [u.id, u]));

      for (const vid of vendorIds) {
        vendorInfoMap[vid] = { ...vMap[vid], ...uMap[vid] };
      }
      for (const rid of resolverIds) {
        const u = uMap[rid];
        resolverMap[rid] = u ? ([u.first_name, u.last_name].filter(Boolean).join(" ") || u.email) : null;
      }
    }

    const payouts = (payoutRows || []).map((p) => {
      const v = vendorInfoMap[p.vendor_id] ?? {};
      return {
        id:                p.id,
        vendorId:          p.vendor_id,
        amount:            p.amount,
        status:            p.status,
        reference:         p.reference,
        bankName:          p.bank_name    ?? v.bank_name    ?? null,
        bankAccount:       p.bank_account ?? v.bank_account_number ?? null,
        error:             p.error        ?? null,
        resolvedAt:        p.resolved_at  ?? null,
        resolvedBy:        p.resolved_by  ? (resolverMap[p.resolved_by] ?? null) : null,
        transferReference: p.transfer_reference ?? null,
        notes:             p.notes        ?? null,
        createdAt:         new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        resolvedAtLabel:   p.resolved_at
          ? new Date(p.resolved_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : null,
        vendor: {
          email:        v.email        ?? null,
          name:         [v.first_name, v.last_name].filter(Boolean).join(" ") || v.email || "Vendor",
          businessName: v.business_name ?? null,
          bankName:     v.bank_name     ?? p.bank_name    ?? null,
          bankAccount:  v.bank_account_number ?? p.bank_account ?? null,
          bankCode:     v.bank_code     ?? null,
          tier:         v.subscription_tier ?? "free",
        },
      };
    });

    // VIP and Premium surface first in the pending queue
    const TIER_RANK = { vip: 0, premium: 1, free: 2 };
    if (status === "pending") {
      payouts.sort((a, b) => (TIER_RANK[a.vendor.tier] ?? 2) - (TIER_RANK[b.vendor.tier] ?? 2));
    }

    return NextResponse.json({ payouts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/payouts — manually resolve a payout (admin + accountant)
// Body: { payoutId, action: "complete"|"reject", transferReference?, notes?, sendEmail? }
export async function POST(request) {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { payoutId, action, transferReference, notes, sendEmail } = await request.json();

    if (!payoutId)                          return NextResponse.json({ error: "payoutId required" }, { status: 400 });
    if (!["complete", "reject"].includes(action)) return NextResponse.json({ error: "action must be complete or reject" }, { status: 400 });
    if (action === "complete" && !transferReference?.trim())
      return NextResponse.json({ error: "transferReference is required when completing a payout" }, { status: 400 });

    // Fetch payout
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
      // Mark completed — wallet was already debited at request time
      await ctx.admin.from("vendor_payouts").update({
        status:             "completed",
        transfer_reference: transferReference.trim(),
        notes:              notes?.trim() || null,
        resolved_at:        now,
        resolved_by:        ctx.user.id,
        updated_at:         now,
      }).eq("id", payoutId);

      // Optionally email the vendor
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
          }).catch((err) => console.error("[payouts] email send failed:", err));
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

    // Refund wallet
    await ctx.admin.rpc("increment_wallet", {
      p_user_id: payout.vendor_id,
      p_amount:  payout.amount,
    }).catch(async () => {
      // Fallback: direct increment if RPC unavailable
      const { data: u } = await ctx.admin.from("users").select("wallet_balance").eq("id", payout.vendor_id).single();
      await ctx.admin.from("users").update({ wallet_balance: (u?.wallet_balance ?? 0) + payout.amount }).eq("id", payout.vendor_id);
    });

    // Wallet transaction for the refund
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
