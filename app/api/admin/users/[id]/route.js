import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (id === user.id) return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });

    const { action } = await request.json();
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

    let update = {};
    if (action === "suspend")             update = { status: "suspended" };
    if (action === "ban")                 update = { status: "banned" };
    if (action === "unsuspend")           update = { status: "active" };
    if (action === "promote")             update = { role: "admin" };
    if (action === "demote")              update = { role: "customer" };
    if (action === "set_logistics_admin") update = { role: "logistics_admin" };
    if (action === "set_rider")           update = { role: "rider" };

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { error: updateErr } = await adminClient.from("users").update(update).eq("id", id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
