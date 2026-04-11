import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Auth guard: super admin only ──────────────────────────────────────────────
async function guardSuperAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Forbidden — super admin only", status: 403 };
  return { user, admin };
}

// GET /api/admin/logistics-partners — list all partners with optional ?active filter
export async function GET(request) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    let query = admin
      .from("logistics_partners")
      .select("id, name, contact_name, phone, email, description, active, created_at")
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.eq("active", true);

    const { data: partners, error: qErr } = await query;
    if (qErr) throw qErr;

    return NextResponse.json({ partners: partners ?? [] });
  } catch (error) {
    console.error("[GET /api/admin/logistics-partners]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/logistics-partners — create a new partner
export async function POST(request) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { user, admin } = guard;

    const body = await request.json();
    const { name, contact_name, phone, email, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Partner name is required." }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone / WhatsApp number is required." }, { status: 400 });
    }

    // Normalise phone to international format if it starts with 0
    let normPhone = phone.trim();
    if (normPhone.startsWith("0")) normPhone = "+234" + normPhone.slice(1);

    const { data: partner, error: insertErr } = await admin
      .from("logistics_partners")
      .insert({
        name:         name.trim(),
        contact_name: contact_name?.trim() ?? null,
        phone:        normPhone,
        email:        email?.trim().toLowerCase() ?? null,
        description:  description?.trim() ?? null,
        active:       true,
        created_by:   user.id,
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, partner }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/logistics-partners]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
