import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/products/[id]/reviews
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const admin = createAdminClient();

    const { data: reviews, error, count } = await admin
      .from("product_reviews")
      .select(`
        id, rating, comment, images, helpful, created_at,
        users!user_id ( first_name, last_name )
      `, { count: "exact" })
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const normalized = (reviews ?? []).map((r) => {
      const u = r.users ?? {};
      const firstName = u.first_name ?? "";
      const lastName  = u.last_name  ?? "";
      // Display as "Adebayo K." for privacy
      const author = firstName
        ? `${firstName} ${lastName ? lastName[0] + "." : ""}`.trim()
        : "Customer";
      return {
        id:      r.id,
        author,
        rating:  r.rating,
        comment: r.comment ?? "",
        images:  r.images ?? [],
        helpful: r.helpful ?? 0,
        date:    r.created_at,
      };
    });

    return NextResponse.json({ reviews: normalized, total: count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
