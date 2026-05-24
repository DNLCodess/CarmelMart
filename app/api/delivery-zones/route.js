import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public endpoint — no auth required. Returns active delivery zones for checkout fee lookup.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state"); // optional: filter by state

    const supabase = await createClient();
    let query = supabase
      .from("delivery_zones")
      .select("id, state, lga, base_fee, per_kg_fee, estimated_days")
      .eq("active", true)
      .order("state")
      .order("lga");

    if (state) query = query.ilike("state", state);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      { zones: data ?? [] },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    // Never fail publicly — return empty so checkout falls back to static fees
    return NextResponse.json({ zones: [] });
  }
}
