import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || null;
    const role   = searchParams.get("role")   || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 25;

    let query = admin
      .from("users")
      .select("id, email, phone, role, status, created_at, wallet_balance", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (role) query = query.eq("role", role);
    if (search) query = query.ilike("email", `%${search}%`);

    const { data, error: qErr, count } = await query;
    if (qErr) throw qErr;

    return NextResponse.json({
      users: data ?? [],
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
      page,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
