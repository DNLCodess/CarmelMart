import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Step 1: Fetch verified vendors (no product join — products.vendor_id → users.id, not vendors.id)
    const { data: vendorRows, error } = await supabase
      .from("vendors")
      .select("id, business_name, description, image, logo_image, banner_image, slug, verification_status")
      .eq("verification_status", "verified")
      .limit(8);

    if (error) throw error;
    if (!vendorRows || vendorRows.length === 0) {
      return NextResponse.json({ success: true, vendors: [] });
    }

    // Step 2: Fetch product counts + a sample image per vendor via users.id
    // vendors.id === users.id (vendors table is keyed on user id)
    const vendorIds = vendorRows.map((v) => v.id);
    const { data: products } = await supabase
      .from("products")
      .select("vendor_id, images")
      .in("vendor_id", vendorIds)
      .eq("status", "active");

    // Group by vendor_id
    const productsByVendor = {};
    for (const p of products ?? []) {
      if (!productsByVendor[p.vendor_id]) productsByVendor[p.vendor_id] = [];
      productsByVendor[p.vendor_id].push(p);
    }

    const vendors = vendorRows.map((v) => {
      const vProducts = productsByVendor[v.id] ?? [];
      const sampleImage =
        vProducts.find((p) => Array.isArray(p.images) && p.images.length > 0)
          ?.images[0] ?? null;
      return {
        id: v.id,
        name: v.business_name,
        business_name: v.business_name,
        description: v.description,
        verified: true,
        productCount: vProducts.length,
        product_count: vProducts.length,
        image: v.image ?? sampleImage,
        logo_image: v.logo_image,
        banner_image: v.banner_image ?? sampleImage,
        slug:
          v.slug ??
          v.business_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ??
          v.id,
      };
    });

    return NextResponse.json({ success: true, vendors });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
