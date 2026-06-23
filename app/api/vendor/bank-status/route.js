import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/vendor/bank-status
 *
 * Reports whether the vendor's saved bank details still need attention.
 * `needsAttention` is true when an account number is on file but the account
 * holder name was never verified (bank_account_name is null) — i.e. the saved
 * bank code / number could not be resolved, so payouts to it would fail.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: vendor } = await admin
      .from("vendors")
      .select("bank_account_number, bank_code, bank_name, bank_account_name")
      .eq("id", user.id)
      .single();

    const hasAccount = !!vendor?.bank_account_number?.trim();
    const verified   = !!vendor?.bank_account_name?.trim();

    return NextResponse.json({
      needsAttention:    hasAccount && !verified,
      bankName:          vendor?.bank_name           ?? null,
      bankCode:          vendor?.bank_code           ?? null,
      bankAccountNumber: vendor?.bank_account_number ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
