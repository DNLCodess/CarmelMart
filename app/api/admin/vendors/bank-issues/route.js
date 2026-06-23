import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorise() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || !["admin", "accountant"].includes(p.role)) return null;
  return { admin };
}

/**
 * GET /api/admin/vendors/bank-issues
 *
 * Lists vendors whose bank account could not be verified — an account number is
 * on file but no account holder name was resolved (usually an invalid bank code).
 * Payouts to these vendors will fail until they fix their details, so admins need
 * to know who to chase.
 */
export async function GET() {
  try {
    const ctx = await authorise();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: vendors, error } = await ctx.admin
      .from("vendors")
      .select("id, business_name, bank_name, bank_account_number, bank_code")
      .is("bank_account_name", null)
      .not("bank_account_number", "is", null)
      .neq("bank_account_number", "");

    if (error) throw error;

    const ids = (vendors ?? []).map((v) => v.id);
    let emailMap = {};
    if (ids.length) {
      const { data: users } = await ctx.admin.from("users").select("id, email").in("id", ids);
      emailMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.email]));
    }

    const issues = (vendors ?? []).map((v) => ({
      id:            v.id,
      businessName:  v.business_name ?? "Vendor",
      email:         emailMap[v.id] ?? null,
      bankName:      v.bank_name ?? "—",
      bankAccount:   v.bank_account_number ?? "—",
      bankCode:      v.bank_code ?? null,
    }));

    return NextResponse.json({ issues });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
