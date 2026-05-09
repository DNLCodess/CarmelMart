import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function guardAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") return { error: "Forbidden", status: 403 };
  return { user, admin };
}

/**
 * GET /api/admin/logistics-staff
 * Returns all users with role='logistics_admin', ordered by created_at desc.
 */
export async function GET() {
  try {
    const guard = await guardAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;

    const { data: staff, error } = await admin
      .from("users")
      .select("id, first_name, last_name, email, phone, status, created_at")
      .eq("role", "logistics_admin")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ staff: staff ?? [] });
  } catch (error) {
    console.error("[GET /api/admin/logistics-staff]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/logistics-staff
 * Body: { first_name, last_name, email, phone, password }
 *
 * Creates a Supabase auth user + users profile with role='logistics_admin'.
 * Email confirmation is skipped — admin is responsible for credential distribution.
 */
export async function POST(request) {
  try {
    const guard = await guardAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;

    const body = await request.json();
    const { first_name, last_name, email, phone, password } = body;

    if (!first_name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "first_name, email, and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check email not already registered
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Create auth user (skip email confirmation)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email:            email.trim().toLowerCase(),
      password,
      email_confirm:    true,
      user_metadata:    { first_name: first_name.trim(), last_name: last_name?.trim() ?? "" },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const authUser = authData.user;

    // Insert into users table with logistics_admin role
    const { error: profileErr } = await admin.from("users").insert({
      id:         authUser.id,
      email:      email.trim().toLowerCase(),
      first_name: first_name.trim(),
      last_name:  last_name?.trim() ?? "",
      phone:      phone?.trim() ?? null,
      role:       "logistics_admin",
      status:     "active",
      verified:   true,
    });

    if (profileErr) {
      // Rollback: delete the auth user if profile insert fails
      await admin.auth.admin.deleteUser(authUser.id);
      throw profileErr;
    }

    return NextResponse.json({
      success: true,
      staff: {
        id:         authUser.id,
        first_name: first_name.trim(),
        last_name:  last_name?.trim() ?? "",
        email:      email.trim().toLowerCase(),
        phone:      phone?.trim() ?? null,
        status:     "active",
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/logistics-staff]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
