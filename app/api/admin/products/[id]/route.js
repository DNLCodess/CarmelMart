import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { action, reason } = await request.json();

    let update = {};
    if (action === "approve") {
      update = { moderation_status: "approved", moderation_reason: null, status: "active" };
    } else if (action === "reject") {
      update = { moderation_status: "rejected", moderation_reason: reason ?? null, status: "inactive" };
    } else if (action === "flag") {
      update = { moderation_status: "flagged", moderation_reason: reason ?? null, status: "inactive" };
    } else if (action === "unflag") {
      update = { moderation_status: "approved", moderation_reason: null, status: "active" };
    } else if (action === "feature") {
      update = { featured: true };
    } else if (action === "unfeature") {
      update = { featured: false };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { error: updateErr } = await admin.from("products").update(update).eq("id", id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
