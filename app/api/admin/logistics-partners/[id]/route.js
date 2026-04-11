import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function guardSuperAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Forbidden — super admin only", status: 403 };
  return { user, admin };
}

// GET /api/admin/logistics-partners/[id]
export async function GET(request, { params }) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    const { data: partner, error } = await admin
      .from("logistics_partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/logistics-partners/[id] — partial update
export async function PATCH(request, { params }) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    // Verify exists
    const { data: existing } = await admin
      .from("logistics_partners")
      .select("id")
      .eq("id", id)
      .single();
    if (!existing) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

    const body = await request.json();
    const allowed = ["name", "contact_name", "phone", "email", "description", "active"];
    const updates = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Normalise phone if provided
    if (updates.phone && updates.phone.startsWith("0")) {
      updates.phone = "+234" + updates.phone.slice(1);
    }

    updates.updated_at = new Date().toISOString();

    const { data: partner, error: updateErr } = await admin
      .from("logistics_partners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/logistics-partners/[id] — hard delete (or deactivate if assigned to orders)
export async function DELETE(request, { params }) {
  try {
    const guard = await guardSuperAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    // Check if this partner has any active assigned orders
    const { count: activeCount } = await admin
      .from("order_logistics")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", id);

    if (activeCount && activeCount > 0) {
      // Soft-delete: deactivate instead of hard delete to preserve history
      await admin
        .from("logistics_partners")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        message: "Partner deactivated (has existing order assignments). Active status set to false.",
        deactivated: true,
      });
    }

    // Hard delete if no order history
    const { error: deleteErr } = await admin
      .from("logistics_partners")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, message: "Partner deleted." });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
