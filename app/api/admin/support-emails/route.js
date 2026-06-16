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

export async function GET(request) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || null;
    const page   = Math.max(1, Number(searchParams.get("page") || 1));
    const limit  = 20;

    let query = ctx.admin
      .from("support_emails")
      .select("id, from_email, from_name, subject, body_text, body_html, status, received_at", { count: "exact" })
      .order("received_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq("status", status);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      emails: rows ?? [],
      total:  count ?? 0,
      pages:  Math.max(1, Math.ceil((count ?? 0) / limit)),
    });
  } catch (e) {
    console.error("[support-emails GET]", e?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
