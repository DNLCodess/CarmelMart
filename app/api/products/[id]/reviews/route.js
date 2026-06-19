import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/products/[id]/reviews
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const supabase = await createClient();

    const { data: reviews, error, count } = await supabase
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

// POST /api/products/[id]/reviews — submit a product review (requires delivered order)
export async function POST(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: product_id } = await params;
    const body = await request.json();
    const { rating, comment, order_id } = body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify: order belongs to this user, is delivered, and contains this product
    const { data: orderItem } = await admin
      .from("order_items")
      .select("id, orders!inner(id, customer_id, status)")
      .eq("product_id", product_id)
      .eq("order_id", order_id)
      .eq("orders.customer_id", user.id)
      .eq("orders.status", "delivered")
      .maybeSingle();

    if (!orderItem) {
      return NextResponse.json(
        { error: "You can only review products from your delivered orders" },
        { status: 403 }
      );
    }

    // Insert — RLS INSERT policy enforces user_id = auth.uid()
    const { data: review, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id,
        user_id:  user.id,
        order_id,
        rating:   Number(rating),
        comment:  comment?.trim() || null,
        images:   [],
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this product for this order" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
