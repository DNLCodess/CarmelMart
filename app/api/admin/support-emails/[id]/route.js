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

const VALID_STATUSES = ["unread", "read", "resolved"];

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAdmin();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body   = await request.json();
    const status = body.status;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await ctx.admin
      .from("support_emails")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (e) {
    console.error("[support-emails PATCH]", e?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
