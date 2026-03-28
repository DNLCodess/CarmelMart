import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getVendorId(admin, userId) {
  const { data } = await admin.from("vendors").select("id").eq("id", userId).single();
  return data?.id ?? null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: vendor, error: vErr } = await admin
      .from("vendors")
      .select(`
        id, business_name, description, return_policy, vacation_mode,
        phone, city, state, bank_account_number, bank_code, bank_name
      `)
      .eq("id", user.id)
      .single();

    if (vErr) throw vErr;

    return NextResponse.json({ settings: vendor ?? {} });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      business_name, description, return_policy, vacation_mode,
      phone, city, state, bank_account_number, bank_code, bank_name,
    } = body;

    const update = {};
    if (business_name      !== undefined) update.business_name      = business_name.trim();
    if (description        !== undefined) update.description        = description.trim();
    if (return_policy      !== undefined) update.return_policy      = return_policy.trim();
    if (vacation_mode      !== undefined) update.vacation_mode      = Boolean(vacation_mode);
    if (phone              !== undefined) update.phone              = phone.trim();
    if (city               !== undefined) update.city               = city.trim();
    if (state              !== undefined) update.state              = state.trim();
    if (bank_account_number !== undefined) update.bank_account_number = bank_account_number.trim();
    if (bank_code          !== undefined) update.bank_code          = bank_code.trim();
    if (bank_name          !== undefined) update.bank_name          = bank_name.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    const admin = createAdminClient();
    const { error: upErr } = await admin.from("vendors").update(update).eq("id", user.id);
    if (upErr) throw upErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
