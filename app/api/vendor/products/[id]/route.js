import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyVendor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  return profile?.role === "vendor" ? user : null;
}

export async function GET(request, { params }) {
  try {
    const user = await verifyVendor();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const admin = createAdminClient();
    const { data: product, error } = await admin
      .from("products")
      .select("id, name, slug, description, price, sale_price, stock, images, status, category_id, categories(id, name, slug)")
      .eq("id", id)
      .eq("vendor_id", user.id)
      .single();
    if (error) throw error;
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await verifyVendor();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const admin = createAdminClient();

    if (body.sale_price != null) {
      const { data: vendor } = await admin
        .from("vendors")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      if ((vendor?.subscription_tier ?? "free") === "free") {
        return NextResponse.json(
          { error: "Promotions & deals are not available on the Basic plan. Upgrade to Premium or VIP to set sale prices.", code: "PROMOTIONS_GATED" },
          { status: 403 }
        );
      }
    }

    const { error } = await admin
      .from("products")
      .update({
        name:        body.name,
        description: body.description,
        price:       body.price,
        sale_price:  body.sale_price ?? null,
        stock:       body.stock,
        category_id: body.category_id,
        status:      body.status,
        images:      body.images ?? [],
        condition:   ["new","used","refurbished"].includes(body.condition) ? body.condition : "new",
        attributes:  body.attributes && typeof body.attributes === "object" ? body.attributes : {},
        updated_at:  new Date().toISOString(),
      })
      .eq("id", id)
      .eq("vendor_id", user.id); // vendor can only edit own products
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await verifyVendor();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin
      .from("products")
      .delete()
      .eq("id", id)
      .eq("vendor_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
