import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 30; // refresh every 30 s

// Anonymise first name + city into social-proof text
function toActivityLabel(order) {
  const name = order.users?.first_name ?? "Someone";
  const city = order.delivery_address?.city ?? order.delivery_address?.state ?? "Nigeria";
  const item = order.order_items?.[0]?.products?.name ?? "a product";
  const mins = Math.max(1, Math.round((Date.now() - new Date(order.created_at).getTime()) / 60_000));
  const ago  = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
  return { name, city, item, ago };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select(`
        created_at,
        delivery_address,
        users!inner(first_name),
        order_items!inner(
          products!inner(name)
        )
      `)
      .gte("created_at", since)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(20);

    const activities = (orders ?? []).map(toActivityLabel);

    return NextResponse.json(
      { activities },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    return NextResponse.json({ activities: [] }, { status: 200 });
  }
}
