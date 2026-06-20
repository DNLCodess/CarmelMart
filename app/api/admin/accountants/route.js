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

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const caller = await getCallerAdmin(supabase, admin);
    if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await admin
      .from("users")
      .select("id, email, first_name, last_name, status, created_at")
      .eq("role", "accountant")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ accountants: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const caller = await getCallerAdmin(supabase, admin);
    if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, password, first_name, last_name } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

    const uid = authData.user.id;

    // Insert into users table with accountant role
    const { error: profileErr } = await admin.from("users").insert({
      id: uid,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role: "accountant",
      status: "active",
    });

    if (profileErr) {
      // Roll back auth user if profile insert fails
      await admin.auth.admin.deleteUser(uid);
      throw profileErr;
    }

    return NextResponse.json({ success: true, id: uid });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
