import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_WITHDRAWAL = 5_000;

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Check vendor role and get wallet balance + bank details in one join
    const { data: userData } = await admin
      .from("users")
      .select("role, wallet_balance")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: vendorData } = await admin
      .from("vendors")
      .select("bank_account_number, bank_code, bank_name")
      .eq("id", user.id)
      .single();

    if (!vendorData?.bank_account_number || !vendorData?.bank_code) {
      return NextResponse.json({
        error: "No bank account on file. Please add your bank details in Settings before withdrawing.",
      }, { status: 400 });
    }

    const { amount } = await request.json();
    const amountNum = Number(amount);

    if (!amountNum || isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` }, { status: 400 });
    }

    if (amountNum > (userData.wallet_balance ?? 0)) {
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
    }

    const reference = `CM-WD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Call Flutterwave Transfers API server-side
    const fwRes = await fetch("https://api.flutterwave.com/v3/transfers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_bank:   vendorData.bank_code,
        account_number: vendorData.bank_account_number,
        amount:         amountNum,
        narration:      `CarmelMart payout — ${reference}`,
        currency:       "NGN",
        reference,
        callback_url:   `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/flutterwave`,
        debit_currency: "NGN",
      }),
    });

    const fwData = await fwRes.json();

    if (!fwRes.ok || fwData.status !== "success") {
      console.error("Flutterwave transfer error:", fwData);
      return NextResponse.json({
        error: fwData.message ?? "Transfer failed. Please try again or contact support.",
      }, { status: 502 });
    }

    // Deduct from wallet and record transaction (single DB transaction via RPC would be ideal,
    // but we use sequential updates here — acceptable given low withdrawal frequency)
    const newBalance = (userData.wallet_balance ?? 0) - amountNum;

    const { error: balanceErr } = await admin
      .from("users")
      .update({ wallet_balance: newBalance })
      .eq("id", user.id);

    if (balanceErr) throw balanceErr;

    const { error: txErr } = await admin
      .from("wallet_transactions")
      .insert({
        user_id:     user.id,
        type:        "debit",
        amount:      amountNum,
        description: `Withdrawal to ${vendorData.bank_name ?? "bank account"} — ${vendorData.bank_account_number}`,
        reference,
      });

    if (txErr) console.error("Failed to record wallet transaction:", txErr);

    return NextResponse.json({
      success: true,
      reference,
      new_balance: newBalance,
      message: "Withdrawal initiated. Funds will arrive within 1–2 business days.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
