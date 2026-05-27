import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code || code.length < 4) {
    return NextResponse.json({ valid: false });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("referral_code", code)
    .single();

  return NextResponse.json({ valid: !!data });
}
