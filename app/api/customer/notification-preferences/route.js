import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_KEYS = new Set([
  "orderUpdates", "promotions", "newArrivals", "priceDrops",
  "reviews", "newsletter", "smsAlerts", "emailDigest",
]);

const DEFAULTS = {
  orderUpdates: true,
  promotions:   true,
  newArrivals:  false,
  priceDrops:   true,
  reviews:      false,
  newsletter:   true,
  smsAlerts:    true,
  emailDigest:  false,
};

// GET /api/customer/notification-preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error: qErr } = await admin
      .from("users")
      .select("notification_preferences")
      .eq("id", user.id)
      .single();

    if (qErr) throw qErr;

    // Merge with defaults so newly added keys always appear
    const prefs = { ...DEFAULTS, ...(data.notification_preferences ?? {}) };

    return NextResponse.json({ prefs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/customer/notification-preferences
// Body: { prefs: Record<string, boolean> }
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const incoming = body.prefs;

    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Whitelist — only allow known boolean keys
    const sanitized = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (ALLOWED_KEYS.has(k) && typeof v === "boolean") {
        sanitized[k] = v;
      }
    }

    const admin = createAdminClient();
    const { error: upErr } = await admin
      .from("users")
      .update({ notification_preferences: sanitized })
      .eq("id", user.id);

    if (upErr) throw upErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
