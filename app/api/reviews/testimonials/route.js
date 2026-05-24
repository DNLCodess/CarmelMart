import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_reviews")
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        users (first_name, last_name, location, avatar_url),
        products (name)
      `
      )
      .eq("rating", 5)
      .not("comment", "is", null)
      .neq("comment", "")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const reviews = (data ?? []).map((r) => ({
      id: r.id,
      name: [r.users?.first_name, r.users?.last_name].filter(Boolean).join(" ") || "Verified Buyer",
      location: r.users?.location ?? "Nigeria",
      avatarUrl: r.users?.avatar_url ?? null,
      rating: r.rating,
      text: r.comment,
      product: r.products?.name ?? null,
      createdAt: r.created_at,
    }));

    return NextResponse.json(
      { reviews },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    return NextResponse.json({ reviews: [] }, { status: 200 });
  }
}
