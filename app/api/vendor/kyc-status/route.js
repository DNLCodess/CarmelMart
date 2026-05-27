import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: vendor } = await admin
      .from("vendors")
      .select("nin_verified, cac_verified, verification_type")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      nin_verified:      vendor?.nin_verified      ?? false,
      cac_verified:      vendor?.cac_verified      ?? false,
      verification_type: vendor?.verification_type ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
