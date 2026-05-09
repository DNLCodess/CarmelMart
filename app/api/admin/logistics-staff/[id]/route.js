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
  return { admin };
}

/**
 * PATCH /api/admin/logistics-staff/[id]
 * Body: { status: 'active' | 'suspended' | 'banned' }
 *
 * - 'active'    → re-activates the account
 * - 'suspended' → temporarily blocks login (redirect to /suspended)
 * - 'banned'    → permanently deactivates (same block, irreversible via UI)
 */
export async function PATCH(request, { params }) {
  try {
    const guard = await guardAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    const body = await request.json();
    const { status } = body;

    if (!["active", "suspended", "banned"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'active', 'suspended', or 'banned'." },
        { status: 400 }
      );
    }

    // Verify target is a logistics_admin
    const { data: target, error: fetchErr } = await admin
      .from("users")
      .select("id, role, status")
      .eq("id", id)
      .single();

    if (fetchErr || !target) {
      return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
    }
    if (target.role !== "logistics_admin") {
      return NextResponse.json(
        { error: "Can only manage logistics_admin accounts via this endpoint." },
        { status: 400 }
      );
    }

    const { error: updateErr } = await admin
      .from("users")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, new_status: status });
  } catch (error) {
    console.error("[PATCH /api/admin/logistics-staff/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/logistics-staff/[id]
 * Permanently deletes the auth user and their profile.
 * Only safe for accounts with no order history. Otherwise, use PATCH status=banned.
 */
export async function DELETE(request, { params }) {
  try {
    const guard = await guardAdmin();
    if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { admin } = guard;
    const { id } = await params;

    // Verify target is a logistics_admin
    const { data: target, error: fetchErr } = await admin
      .from("users")
      .select("id, role")
      .eq("id", id)
      .single();

    if (fetchErr || !target) {
      return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
    }
    if (target.role !== "logistics_admin") {
      return NextResponse.json(
        { error: "Can only delete logistics_admin accounts via this endpoint." },
        { status: 400 }
      );
    }

    // Check if this user has assigned any orders (order_logistics.assigned_by)
    const { count } = await admin
      .from("order_logistics")
      .select("id", { count: "exact", head: true })
      .eq("assigned_by", id);

    if (count > 0) {
      // Has history — ban instead of delete to preserve audit trail
      await admin
        .from("users")
        .update({ status: "banned", updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true, deactivated: true, message: "Account deactivated (has order history)." });
    }

    // No history — hard delete
    const { error: deleteErr } = await admin.auth.admin.deleteUser(id);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("[DELETE /api/admin/logistics-staff/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
