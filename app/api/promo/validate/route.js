import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, order_total } = await request.json();
    if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: promo } = await admin
      .from("promo_codes")
      .select("id, code, type, value, min_order, max_uses, used_count, expires_at, active")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (!promo || !promo.active)
      return NextResponse.json({ error: "Invalid or expired promo code", valid: false }, { status: 400 });

    if (promo.expires_at && new Date(promo.expires_at) < new Date())
      return NextResponse.json({ error: "Promo code has expired", valid: false }, { status: 400 });

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses)
      return NextResponse.json({ error: "Promo code has reached its usage limit", valid: false }, { status: 400 });

    if (order_total !== undefined && order_total < promo.min_order)
      return NextResponse.json({
        error: `Minimum order of ₦${promo.min_order.toLocaleString()} required for this code`,
        valid: false,
      }, { status: 400 });

    // Check if this user already used it
    const { count } = await admin
      .from("promo_code_uses")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promo.id)
      .eq("user_id", user.id);

    if ((count ?? 0) > 0)
      return NextResponse.json({ error: "You have already used this promo code", valid: false }, { status: 400 });

    // Calculate discount
    let discount = 0;
    if (promo.type === "percentage") {
      discount = Math.round((order_total ?? 0) * (promo.value / 100));
    } else {
      discount = promo.value;
    }
    // Cap discount at order total
    if (order_total !== undefined) discount = Math.min(discount, order_total);

    return NextResponse.json({
      valid:       true,
      promoId:     promo.id,
      code:        promo.code,
      type:        promo.type,
      value:       promo.value,
      discount,
      description: promo.type === "percentage"
        ? `${promo.value}% off`
        : `₦${promo.value.toLocaleString()} off`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
