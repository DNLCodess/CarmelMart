import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVendorProductDecision } from "@/lib/email";

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
    const notifyVendor = ["approve", "reject", "flag"].includes(action);

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

    // Notify vendor of approval/rejection
    if (notifyVendor) {
      try {
        // Fetch product name and vendor info
        const { data: product } = await admin
          .from("products")
          .select("name, vendor_id")
          .eq("id", id)
          .single();

        if (product?.vendor_id) {
          const { data: vendor } = await admin
            .from("vendors")
            .select("business_name, email")
            .eq("id", product.vendor_id)
            .single();

          if (vendor?.email) {
            await sendVendorProductDecision({
              to:          vendor.email,
              vendorName:  vendor.business_name ?? "Vendor",
              productName: product.name,
              approved:    action === "approve",
              reason:      reason ?? null,
            });
          }
        }
      } catch {
        // Email failure should not block the response
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const { error: delErr } = await admin.from("products").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
