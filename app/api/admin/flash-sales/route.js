import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return { user, admin };
}

export async function GET() {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data } = await ctx.admin
      .from("flash_sales")
      .select("id, title, description, discount_type, discount_value, starts_at, ends_at, active, created_at, flash_sale_products(count)")
      .order("starts_at", { ascending: false });

    const now = new Date();
    const sales = (data || []).map((s) => {
      const start = new Date(s.starts_at);
      const end   = new Date(s.ends_at);
      const state = !s.active ? "disabled" : now < start ? "scheduled" : now > end ? "ended" : "live";
      return {
        id:            s.id,
        title:         s.title,
        description:   s.description,
        discountType:  s.discount_type,
        discountValue: s.discount_value,
        startsAt:      s.starts_at,
        endsAt:        s.ends_at,
        active:        s.active,
        state,
        productCount:  s.flash_sale_products?.[0]?.count ?? 0,
        createdAt:     new Date(s.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
      };
    });

    return NextResponse.json({ sales });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, description, discount_type, discount_value, starts_at, ends_at } = await request.json();

    if (!title?.trim())  return NextResponse.json({ error: "Title required" }, { status: 400 });
    if (!starts_at || !ends_at) return NextResponse.json({ error: "Start and end times required" }, { status: 400 });
    if (new Date(ends_at) <= new Date(starts_at))
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    if (!discount_value || discount_value <= 0)
      return NextResponse.json({ error: "Discount value must be > 0" }, { status: 400 });
    if (discount_type === "percentage" && discount_value > 100)
      return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });

    const { data, error } = await ctx.admin
      .from("flash_sales")
      .insert({
        title:          title.trim(),
        description:    description?.trim() || null,
        discount_type:  discount_type || "percentage",
        discount_value: Number(discount_value),
        starts_at,
        ends_at,
        created_by:     ctx.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ sale: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
