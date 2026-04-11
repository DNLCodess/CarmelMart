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

// GET /api/admin/payouts — list vendor payout requests
export async function GET(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // vendor_payouts.vendor_id → vendors.id; vendors.id === users.id (auth.users FK, not public.users)
    // Use separate queries to avoid cross-schema join failures
    const { data: payoutRows, error } = await ctx.admin
      .from("vendor_payouts")
      .select("id, vendor_id, amount, status, reference, flw_ref, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const vendorIds = [...new Set((payoutRows ?? []).map((p) => p.vendor_id).filter(Boolean))];
    let vendorInfoMap = {};
    if (vendorIds.length > 0) {
      const [{ data: vendorRows }, { data: userRows }] = await Promise.all([
        ctx.admin.from("vendors").select("id, business_name, bank_account_number, bank_code").in("id", vendorIds),
        ctx.admin.from("users").select("id, email").in("id", vendorIds),
      ]);
      const vMap = Object.fromEntries((vendorRows ?? []).map((v) => [v.id, v]));
      const uMap = Object.fromEntries((userRows ?? []).map((u) => [u.id, u]));
      for (const vid of vendorIds) {
        vendorInfoMap[vid] = { ...vMap[vid], email: uMap[vid]?.email };
      }
    }

    const payouts = (payoutRows || []).map((p) => {
      const v = vendorInfoMap[p.vendor_id] ?? {};
      return {
        id:        p.id,
        vendorId:  p.vendor_id,
        amount:    p.amount,
        status:    p.status,
        reference: p.reference,
        flwRef:    p.flw_ref,
        createdAt: new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
        vendor: {
          email:       v.email ?? null,
          name:        v.email ?? "Vendor",
          businessName: v.business_name ?? null,
          bankAccount: v.bank_account_number ?? null,
          bankCode:    v.bank_code ?? null,
        },
      };
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/payouts — approve a payout (trigger Flutterwave transfer)
export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { payoutId } = await request.json();
    if (!payoutId) return NextResponse.json({ error: "payoutId required" }, { status: 400 });

    // Fetch payout + vendor bank details
    const { data: payout, error: fetchErr } = await ctx.admin
      .from("vendor_payouts")
      .select("id, vendor_id, amount, status, reference, vendors!vendor_id(bank_account_number, bank_code, business_name)")
      .eq("id", payoutId)
      .single();

    if (fetchErr || !payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (payout.status !== "pending") return NextResponse.json({ error: "Payout already processed" }, { status: 400 });

    const { bank_account_number, bank_code, business_name } = payout.vendors ?? {};
    if (!bank_account_number || !bank_code)
      return NextResponse.json({ error: "Vendor has no bank details on file" }, { status: 400 });

    // Mark as processing immediately to prevent double-approvals
    await ctx.admin.from("vendor_payouts").update({ status: "processing" }).eq("id", payoutId);

    // Initiate Flutterwave transfer (10-second timeout)
    let flwData;
    try {
      const flwRes = await fetch("https://api.flutterwave.com/v3/transfers", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
        body: JSON.stringify({
          account_bank:    bank_code,
          account_number:  bank_account_number,
          amount:          payout.amount,
          currency:        "NGN",
          narration:       `CarmelMart payout – ${business_name}`,
          reference:       payout.reference,
          callback_url:    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/flutterwave`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      flwData = await flwRes.json();
    } catch (fetchErr) {
      // Revert to pending on network/timeout errors
      await ctx.admin.from("vendor_payouts").update({ status: "pending" }).eq("id", payoutId);
      const isTimeout = fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "Payment provider timed out. Please try again." : "Transfer failed. Please try again." },
        { status: 502 }
      );
    }

    if (flwData.status !== "success") {
      // Revert to pending if FLW rejected it
      await ctx.admin.from("vendor_payouts").update({ status: "pending" }).eq("id", payoutId);
      return NextResponse.json({ error: flwData.message ?? "Transfer failed" }, { status: 502 });
    }

    // Mark as processing — the transfer.completed webhook will set it to "completed"
    // when Flutterwave confirms delivery (1-2 business days).
    await ctx.admin.from("vendor_payouts").update({
      status:  "processing",
      flw_ref: flwData.data?.id?.toString() ?? null,
    }).eq("id", payoutId);

    return NextResponse.json({ success: true, flwRef: flwData.data?.id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
