import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVendorKYCDecision } from "@/lib/email";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// PATCH /api/admin/vendors/[id] — approve, reject, suspend
export async function PATCH(request, { params }) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { action, reason } = await request.json();

    const statusMap = {
      approve:   "verified",
      reject:    "rejected",
      suspend:   "suspended",
      unsuspend: "verified",
    };

    const newStatus = statusMap[action];
    if (!newStatus) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const admin = createAdminClient();

    // Only set rejection_reason on reject; clear it on approve / unsuspend.
    const update = { verification_status: newStatus };
    if (action === "reject")   update.rejection_reason = reason ?? null;
    if (action === "approve" || action === "unsuspend") update.rejection_reason = null;

    const { error } = await admin
      .from("vendors")
      .update(update)
      .eq("id", id);

    if (error) throw error;

    // Email the vendor about the KYC decision
    if (action === "approve" || action === "reject") {
      // vendors.id === users.id — fetch separately to avoid cross-schema FK join
      const [{ data: vendorRow }, { data: userRow }] = await Promise.all([
        admin.from("vendors").select("business_name").eq("id", id).single(),
        admin.from("users").select("email").eq("id", id).single(),
      ]);

      const vendorEmail = userRow?.email;
      const vendorName  = vendorRow?.business_name ?? "Vendor";
      if (vendorEmail) {
        sendVendorKYCDecision({
          to:         vendorEmail,
          vendorName,
          approved:   action === "approve",
          reason:     reason ?? null,
        });
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
