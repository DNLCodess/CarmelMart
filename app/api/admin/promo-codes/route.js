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
      .from("promo_codes")
      .select("id, code, type, value, min_order, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false });

    const codes = (data || []).map((c) => ({
      id:        c.id,
      code:      c.code,
      type:      c.type,
      value:     c.value,
      minOrder:  c.min_order,
      maxUses:   c.max_uses,
      usedCount: c.used_count,
      expiresAt: c.expires_at,
      active:    c.active,
      expired:   c.expires_at ? new Date(c.expires_at) < new Date() : false,
      createdAt: new Date(c.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
    }));

    return NextResponse.json({ codes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { code, type, value, min_order, max_uses, expires_at } = await request.json();
    if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    if (!value || value <= 0) return NextResponse.json({ error: "Value must be > 0" }, { status: 400 });
    if (type === "percentage" && value > 100) return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });

    const { data, error } = await ctx.admin
      .from("promo_codes")
      .insert({
        code:       code.trim().toUpperCase(),
        type:       type || "percentage",
        value:      Number(value),
        min_order:  Number(min_order) || 0,
        max_uses:   max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ code: data }, { status: 201 });
  } catch (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Code already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
