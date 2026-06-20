import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getCallerAdmin(supabase, adminClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await adminClient.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return user;
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const caller = await getCallerAdmin(supabase, admin);
    if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    // Verify target is an accountant
    const { data: target } = await admin.from("users").select("role").eq("id", id).single();
    if (!target || target.role !== "accountant") {
      return NextResponse.json({ error: "Accountant not found" }, { status: 404 });
    }

    if (body.action === "reset_password") {
      const { password } = body;
      if (!password || password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password });
      if (pwErr) throw pwErr;
      return NextResponse.json({ success: true });
    }

    if (body.action === "suspend") {
      const { error: upErr } = await admin.from("users").update({ status: "suspended" }).eq("id", id);
      if (upErr) throw upErr;
      return NextResponse.json({ success: true });
    }

    if (body.action === "activate") {
      const { error: upErr } = await admin.from("users").update({ status: "active" }).eq("id", id);
      if (upErr) throw upErr;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const caller = await getCallerAdmin(supabase, admin);
    if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const { data: target } = await admin.from("users").select("role").eq("id", id).single();
    if (!target || target.role !== "accountant") {
      return NextResponse.json({ error: "Accountant not found" }, { status: 404 });
    }

    // Delete auth user (profile row deleted via cascade or trigger)
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
