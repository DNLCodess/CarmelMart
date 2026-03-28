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
      .from("platform_settings")
      .select("key, value, description, updated_at");

    const settings = Object.fromEntries((data || []).map((s) => [s.key, { value: s.value, description: s.description, updatedAt: s.updated_at }]));
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates = await request.json(); // { key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await ctx.admin
        .from("platform_settings")
        .upsert({ key, value: String(value), updated_at: new Date().toISOString(), updated_by: ctx.user.id }, { onConflict: "key" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
