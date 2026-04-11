/**
 * POST /api/vendor/wallet/withdraw
 *
 * Initiates a vendor self-service withdrawal via Flutterwave Transfers.
 *
 * Reliability / security improvements:
 *   1. Atomic wallet debit via decrement_wallet_safe() RPC — eliminates the
 *      TOCTOU race condition from read-then-write.
 *   2. vendor_payouts record created for every withdrawal so the
 *      transfer.completed webhook can update the final status.
 *   3. Correct sequence: validate → create payouts record → call Flutterwave
 *      → if Flutterwave fails, mark payouts as failed (no wallet change yet)
 *      → if Flutterwave accepts, atomically debit wallet + mark processing.
 *   4. Rate limited: 3 withdrawals per hour per vendor.
 *   5. 10-second timeout on the upstream Flutterwave call.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, retryAfterSeconds } from "@/lib/rateLimit";

const MIN_WITHDRAWAL = 5_000;
const FLW_TIMEOUT_MS = 10_000;

export async function POST(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const rl = rateLimit(`withdraw:${user.id}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many withdrawal requests. You can withdraw up to 3 times per hour." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(rl.resetAt)) },
        }
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
      .select("bank_account_number, bank_code, bank_name")
      .eq("id", user.id)
      .single();

    if (!vendorData?.bank_account_number || !vendorData?.bank_code) {
      return NextResponse.json(
        { error: "No bank account on file. Please add your bank details in Settings before withdrawing." },
        { status: 400 }
      );
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { amount } = await request.json();
    const amountNum = Number(amount);

    if (!amountNum || isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
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

    // ── Create vendor_payouts record (status: pending) ────────────────────────
    // This allows the transfer.completed webhook to find and update the record
    // regardless of whether it originated from self-service or admin approval.
    const { error: payoutInsertErr } = await admin.from("vendor_payouts").insert({
      vendor_id:    user.id,
      amount:       amountNum,
      status:       "pending",
      reference,
      bank_name:    vendorData.bank_name    ?? null,
      bank_account: vendorData.bank_account_number,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    });

    if (payoutInsertErr) throw payoutInsertErr;

    // ── Call Flutterwave Transfers API (with timeout) ─────────────────────────
    let fwData;
    try {
      const fwRes = await fetch("https://api.flutterwave.com/v3/transfers", {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          account_bank:    vendorData.bank_code,
          account_number:  vendorData.bank_account_number,
          amount:          amountNum,
          narration:       `CarmelMart payout — ${reference}`,
          currency:        "NGN",
          reference,
          callback_url:    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/flutterwave`,
          debit_currency:  "NGN",
        }),
        signal: AbortSignal.timeout(FLW_TIMEOUT_MS),
      });
      fwData = await fwRes.json();
    } catch (fetchErr) {
      // Flutterwave unreachable — mark payout as failed, no wallet change
      await admin
        .from("vendor_payouts")
        .update({ status: "failed", error: "Payment provider unreachable", updated_at: new Date().toISOString() })
        .eq("reference", reference);

      const isTimeout = fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "Payment provider timed out. Please try again." : "Transfer failed. Please try again or contact support." },
        { status: 502 }
      );
    }

    if (!fwData || fwData.status !== "success") {
      // Flutterwave rejected the transfer — mark payout as failed, no wallet change
      await admin
        .from("vendor_payouts")
        .update({
          status:     "failed",
          error:      fwData?.message ?? "Transfer rejected by payment provider",
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference);

      return NextResponse.json(
        { error: fwData?.message ?? "Transfer failed. Please try again or contact support." },
        { status: 502 }
      );
    }

    // ── Flutterwave accepted — atomically debit wallet ────────────────────────
    // decrement_wallet_safe raises INSUFFICIENT_BALANCE if balance dropped
    // between our earlier read and now (concurrent request guard).
    const { error: debitErr } = await admin.rpc("decrement_wallet_safe", {
      p_user_id: user.id,
      p_amount:  amountNum,
    });

    if (debitErr) {
      // If debit fails the transfer is already queued at Flutterwave.
      // Mark payout as "processing" and log for manual reconciliation.
      // Do NOT mark as failed — the money is moving.
      await admin
        .from("vendor_payouts")
        .update({
          status:     "processing",
          error:      "Wallet debit failed — manual reconciliation required",
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference);

      console.error(
        `[withdraw] Wallet debit failed after Flutterwave accepted transfer. ` +
        `user=${user.id} reference=${reference} amount=${amountNum}. Manual reconciliation needed.`,
        debitErr
      );

      // Still tell the user it's processing — the money will arrive regardless
      return NextResponse.json({
        success:     true,
        reference,
        new_balance: userData.wallet_balance, // stale, but debit failed anyway
        message:     "Withdrawal initiated. Funds will arrive within 1–2 business days.",
      });
    }

    // ── Mark payout as processing + store wallet transaction ──────────────────
    await Promise.all([
      admin
        .from("vendor_payouts")
        .update({
          status:     "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference),

      admin.from("wallet_transactions").insert({
        user_id:     user.id,
        type:        "debit",
        amount:      amountNum,
        description: `Withdrawal to ${vendorData.bank_name ?? "bank account"} — ${vendorData.bank_account_number}`,
        reference,
      }),
    ]);

    // New balance = old balance - amount (debit succeeded)
    const newBalance = (userData.wallet_balance ?? 0) - amountNum;

    return NextResponse.json({
      success:     true,
      reference,
      new_balance: newBalance,
      message:     "Withdrawal initiated. Funds will arrive within 1–2 business days.",
    });
  } catch (error) {
    console.error("[POST /api/vendor/wallet/withdraw]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
