import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { rider_id } = await request.json();

    // Validate rider exists and has rider role
    if (rider_id !== null) {
      const { data: rider } = await admin.from("users").select("role, status").eq("id", rider_id).single();
      if (!rider || rider.role !== "rider") return NextResponse.json({ error: "Invalid rider" }, { status: 400 });
      if (rider.status !== "active") return NextResponse.json({ error: "Rider is not active" }, { status: 400 });
    }

    const { error } = await admin
      .from("orders")
      .update({ rider_id: rider_id ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
