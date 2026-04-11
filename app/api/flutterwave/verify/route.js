/**
 * POST /api/flutterwave/verify
 *
 * Proxy to Flutterwave's transaction verify API.
 * Used by the vendor registration flow (and any other one-off payment).
 *
 * Security fixes applied:
 *   1. Auth required — unauthenticated callers are rejected.
 *   2. Ownership check — if a payments record exists for this tx_ref,
 *      it must belong to the calling user. Prevents transaction ID probing.
 *   3. 10-second timeout on the upstream Flutterwave call.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FLW_SECRET_KEY  = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_TIMEOUT_MS  = 10_000;

export async function POST(request) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { transaction_id } = await request.json();
    if (!transaction_id) {
      return NextResponse.json({ success: false, error: "transaction_id is required" }, { status: 400 });
    }

    // ── 2. Upstream verification (with timeout) ────────────────────────────────
    let fwData;
    try {
      const fwRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction_id)}/verify`,
        {
          method:  "GET",
          headers: {
            Authorization:  `Bearer ${FLW_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(FLW_TIMEOUT_MS),
        }
      );
      fwData = await fwRes.json();
    } catch (fetchErr) {
      const isTimeout = fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError";
      return NextResponse.json(
        { success: false, error: isTimeout ? "Payment provider timed out. Please try again." : "Failed to reach payment provider." },
        { status: 502 }
      );
    }

    if (fwData.status !== "success" || fwData.data?.status !== "successful") {
      return NextResponse.json(
        { success: false, error: "Payment verification failed", message: fwData.message },
        { status: 400 }
      );
    }

    const txRef = fwData.data.tx_ref;

    // ── 3. Ownership check ────────────────────────────────────────────────────
    // If this tx_ref was registered in our payments table, it must belong to
    // the calling user. This prevents any authenticated user from probing
    // another user's transaction ID.
    //
    // Vendor registration payments created before the payments-table era will
    // have no row here — those pass through (acceptable; the action that
    // follows, /api/vendor/complete-registration, does its own server-side
    // amount check and updates the right user's vendor record by session userId).
    const admin = createAdminClient();
    const { data: paymentRecord } = await admin
      .from("payments")
      .select("user_id, status")
      .eq("reference", txRef)
      .maybeSingle();

    if (paymentRecord) {
      if (paymentRecord.user_id !== user.id) {
        // Transaction belongs to a different user — deny
        return NextResponse.json(
          { success: false, error: "Transaction does not belong to this account." },
          { status: 403 }
        );
      }
      if (paymentRecord.status === "success") {
        // Already processed — returning the data is harmless (idempotent read),
        // but flag it so callers know not to re-process.
        return NextResponse.json({
          success:          true,
          already_processed: true,
          data: buildResponseData(fwData.data),
        });
      }
    }

    return NextResponse.json({ success: true, data: buildResponseData(fwData.data) });
  } catch (error) {
    console.error("[/api/flutterwave/verify]", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during verification." },
      { status: 500 }
    );
  }
}

function buildResponseData(d) {
  return {
    amount:          d.amount,
    currency:        d.currency,
    transaction_id:  d.id,
    tx_ref:          d.tx_ref,
    flw_ref:         d.flw_ref,
    charged_amount:  d.charged_amount,
    payment_type:    d.payment_type,
    customer: {
      email: d.customer?.email,
      name:  d.customer?.name,
    },
  };
}
