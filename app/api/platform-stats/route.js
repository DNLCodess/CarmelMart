import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300; // revalidate every 5 minutes

export async function GET() {
  try {
    const admin = await createClient();

    const [vendorsRes, productsRes, ordersRes] = await Promise.all([
      admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
      admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active").eq("moderation_status", "approved"),
      admin.from("orders").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json(
      {
        vendors:  vendorsRes.count  ?? 0,
        products: productsRes.count ?? 0,
        orders:   ordersRes.count   ?? 0,
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
