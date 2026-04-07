import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 300; // revalidate every 5 minutes

export async function GET() {
  try {
    const admin = createAdminClient();

    const [vendorsRes, productsRes, ordersRes] = await Promise.all([
      admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
      admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("orders").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      vendors:  vendorsRes.count  ?? 0,
      products: productsRes.count ?? 0,
      orders:   ordersRes.count   ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
