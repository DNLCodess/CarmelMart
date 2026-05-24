import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: qErr } = await supabase
      .from("users")
      .select("id, email, phone, role, referral_code, wallet_balance, created_at, first_name, last_name, location, addresses, avatar_url")
      .eq("id", user.id)
      .single();

    if (qErr) throw qErr;

    return NextResponse.json({ profile });
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
    const { first_name, last_name, phone, location, addresses } = body;

    const update = {};
    if (first_name  !== undefined) update.first_name  = first_name.trim();
    if (last_name   !== undefined) update.last_name   = last_name.trim();
    if (phone       !== undefined) update.phone       = phone.trim();
    if (location    !== undefined) update.location    = location.trim();
    if (addresses   !== undefined) update.addresses   = addresses;

    const { error: upErr } = await supabase
      .from("users")
      .update(update)
      .eq("id", user.id);

    if (upErr) throw upErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
