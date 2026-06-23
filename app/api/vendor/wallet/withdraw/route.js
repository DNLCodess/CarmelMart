/**
 * POST /api/vendor/wallet/withdraw
 *
 * Queues a vendor withdrawal request for manual processing by admin/accountant.
 * Funds are reserved immediately via atomic wallet debit — the payout record
 * stays "pending" until an admin or accountant marks it as completed or rejected.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, retryAfterSeconds } from "@/lib/rateLimit";

const MIN_WITHDRAWAL = 5_000;

export async function POST(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit: 3 requests per hour ──────────────────────────────────────
    const rl = rateLimit(`withdraw:${user.id}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many withdrawal requests. You can submit up to 3 per hour." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
        },
      );
    }

    const admin = createAdminClient();

    // ── Role + balance check ──────────────────────────────────────────────────
    const { data: userData } = await admin
      .from("users")
      .select("role, wallet_balance")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "vendor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Bank details ──────────────────────────────────────────────────────────
    const { data: vendorData } = await admin
      .from("vendors")
      .select("bank_account_number, bank_code, bank_name, bank_account_name")
      .eq("id", user.id)
      .single();

    if (!vendorData?.bank_account_number || !vendorData?.bank_code) {
      return NextResponse.json(
        { error: "No bank account on file. Please add your bank details in Settings before withdrawing." },
        { status: 400 },
      );
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { amount } = await request.json();
    const amountNum = Number(amount);

    if (!amountNum || isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 },
      );
    }

    if (amountNum > (userData.wallet_balance ?? 0)) {
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
    }

    // ── Generate reference ────────────────────────────────────────────────────
    const reference = `CM-WD-${Date.now()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 7)
      .toUpperCase()}`;

    // ── Atomically debit wallet (reserves funds) ──────────────────────────────
    const { error: debitErr } = await admin.rpc("decrement_wallet_safe", {
      p_user_id: user.id,
      p_amount:  amountNum,
    });

    if (debitErr) {
      const isInsufficient = debitErr.message?.includes("INSUFFICIENT_BALANCE");
      return NextResponse.json(
        { error: isInsufficient ? "Insufficient wallet balance" : "Failed to process withdrawal. Please try again." },
        { status: isInsufficient ? 400 : 500 },
      );
    }

    // ── Create payout record + wallet transaction ─────────────────────────────
    await Promise.all([
      admin.from("vendor_payouts").insert({
        vendor_id:    user.id,
        amount:       amountNum,
        status:            "pending",
        reference,
        bank_name:         vendorData.bank_name    ?? null,
        bank_account:      vendorData.bank_account_number,
        bank_account_name: vendorData.bank_account_name ?? null,
      }),

      admin.from("wallet_transactions").insert({
        user_id:     user.id,
        type:        "debit",
        amount:      amountNum,
        description: `Withdrawal request to ${vendorData.bank_name ?? "bank"} — ${vendorData.bank_account_number}`,
        reference,
      }),
    ]);

    const newBalance = (userData.wallet_balance ?? 0) - amountNum;

    return NextResponse.json({
      success:     true,
      reference,
      new_balance: newBalance,
      message:     "Withdrawal request submitted. Our team will process your transfer within 1–2 business days.",
    });
  } catch (error) {
    console.error("[POST /api/vendor/wallet/withdraw]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
