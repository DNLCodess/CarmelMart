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
      .select(`id, name, slug, description, price, sale_price, stock, images, status,
        condition, moderation_status, moderation_reason, attributes,
        variant_type, quantity_tiers,
        category_id, categories(id, name, slug, template),
        media_author, media_isbn, media_publisher, media_publish_date, media_edition,
        media_pages, media_language, media_format, media_genre,
        is_digital, digital_only, digital_price, digital_file_path, digital_file_size`)
      .eq("id", id)
      .eq("vendor_id", user.id)
      .single();
    if (error) throw error;
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: variants } = await admin
      .from("product_variants")
      .select("id, combination, stock, price, image, is_active")
      .eq("product_id", id)
      .eq("is_active", true)
      .order("created_at");
    return NextResponse.json({ success: true, product: { ...product, variants: variants ?? [] } });
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

    // Fetch current product to check approval status before validating the incoming status
    const { data: existing } = await admin
      .from("products")
      .select("moderation_status, status")
      .eq("id", id)
      .eq("vendor_id", user.id)
      .single();

    const isAlreadyApproved = existing?.moderation_status === "approved";
    const needsReReview     = ["rejected", "flagged"].includes(existing?.moderation_status);

    // Already-approved products may stay "active" when edited — no re-review needed.
    // Vendors can also demote to "draft" to hide the product temporarily.
    const VENDOR_ALLOWED_STATUSES = ["draft", "inactive"];
    if (body.status !== undefined && !VENDOR_ALLOWED_STATUSES.includes(body.status)) {
      if (!(body.status === "active" && isAlreadyApproved)) {
        return NextResponse.json(
          { error: "Products must be submitted for admin review before going live." },
          { status: 403 }
        );
      }
    }

    if (!body.category_id) {
      return NextResponse.json({ error: "Please select a category for this product" }, { status: 400 });
    }

    const isDigital     = body.is_digital ?? false;
    const isDigitalOnly = body.digital_only ?? false;

    const update = {
      name:           body.name,
      description:    body.description,
      price:          body.price,
      sale_price:     body.sale_price ?? null,
      // Digital-only products have unlimited stock — managed automatically
      stock:          isDigitalOnly ? 9999 : body.stock,
      category_id:    body.category_id,
      images:         body.images ?? [],
      attributes:     body.attributes && typeof body.attributes === "object" ? body.attributes : {},
      variant_type:   ["none","descriptive","variants"].includes(body.variant_type) ? body.variant_type : "none",
      quantity_tiers: Array.isArray(body.quantity_tiers) && body.quantity_tiers.length ? body.quantity_tiers : null,
      updated_at:     new Date().toISOString(),
    };
    if (body.status !== undefined) update.status = body.status;

    // If the vendor is re-saving a rejected or flagged product, move it back into the
    // review queue automatically so the admin sees it again.
    if (needsReReview) {
      update.moderation_status = "pending";
      update.moderation_reason = null;
      update.status            = "inactive"; // override any status sent by the client
    }

    // Books & Media fields — only written when the caller sends them
    if (body.is_media_category) {
      Object.assign(update, {
        media_author:       body.media_author ?? null,
        media_isbn:         body.media_isbn ?? null,
        media_publisher:    body.media_publisher ?? null,
        media_publish_date: body.media_publish_date ?? null,
        media_edition:      body.media_edition ?? null,
        media_pages:        body.media_pages ?? null,
        media_language:     body.media_language ?? "English",
        media_format:       body.media_format ?? null,
        media_genre:        body.media_genre ?? null,
        is_digital:         isDigital,
        digital_only:       isDigitalOnly,
        digital_price:      isDigital && !isDigitalOnly && body.digital_price ? Number(body.digital_price) : null,
        digital_file_path:  isDigital ? (body.digital_file_path ?? null) : null,
        digital_file_size:  isDigital ? (body.digital_file_size ?? null) : null,
      });
    }

    const { error } = await admin
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("vendor_id", user.id); // vendor can only edit own products
    if (error) throw error;

    // Upsert product variants: delete all existing and re-insert
    if (body.variant_type === "variants" && Array.isArray(body.variants)) {
      await admin.from("product_variants").delete().eq("product_id", id);
      if (body.variants.length > 0) {
        const variantRows = body.variants.map((v) => ({
          product_id:  id,
          combination: v.combination,
          stock:       Number(v.stock ?? 0),
          price:       v.price != null ? Number(v.price) : null,
        }));
        const { error: varErr } = await admin.from("product_variants").insert(variantRows);
        if (varErr) throw varErr;
      }
    } else if (body.variant_type !== "variants") {
      // Clear variants when switching away from variants mode
      await admin.from("product_variants").delete().eq("product_id", id);
    }

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
