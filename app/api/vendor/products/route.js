import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProductLimit, checkDigitalProductLimit } from "@/lib/subscription";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: products, error } = await admin
      .from("products")
      .select("*, moderation_status, moderation_reason, categories(id, name, slug)")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalized = (products || []).map((p) => ({
      id:                p.id,
      name:              p.name,
      price:             p.price,
      sale_price:        p.sale_price,
      stock:             p.stock,
      status:            p.status,
      moderation_status: p.moderation_status ?? "pending",
      moderation_reason: p.moderation_reason ?? null,
      image:             Array.isArray(p.images) ? p.images[0] : null,
      images:            Array.isArray(p.images) ? p.images : [],
      sold_count:        p.sold_count,
      avg_rating:        p.avg_rating,
      category:          p.categories ?? null,
    }));

    return NextResponse.json({ products: normalized });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — bulk status update for multiple products
export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { ids, status } = await request.json();
    if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });
    // Vendors can only set inactive/draft — "active" requires admin approval
    if (!["inactive", "draft"].includes(status))
      return NextResponse.json({ error: "Invalid status. Products can only be set to inactive or draft by vendors." }, { status: 400 });

    const { error } = await admin
      .from("products")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids)
      .eq("vendor_id", user.id); // ownership guard

    if (error) throw error;
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Enforce product limit based on subscription tier
    const { data: vendor } = await admin
      .from("vendors")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = vendor?.subscription_tier ?? "free";

    // Count all non-rejected products (pending, approved, flagged, inactive, draft all count)
    const { count: productCount } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .neq("moderation_status", "rejected");

    const limitCheck = checkProductLimit(tier, productCount ?? 0);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Product limit reached. Your ${tier} plan allows up to ${limitCheck.limit} products. Upgrade your plan to add more.`,
          code: "PRODUCT_LIMIT_REACHED",
          limit: limitCheck.limit,
          current: limitCheck.current,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name, description, price, sale_price, stock, category_id, images, condition, attributes,
      // Books & Media fields
      media_author, media_isbn, media_publisher, media_publish_date,
      media_edition, media_pages, media_language, media_format, media_genre,
      is_digital, digital_file_path, digital_price, digital_file_size,
    } = body;

    // Enforce digital product limit when creating a digital product
    if (is_digital) {
      const { count: digitalCount } = await admin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .eq("is_digital", true)
        .neq("moderation_status", "rejected");

      const digitalLimitCheck = checkDigitalProductLimit(tier, digitalCount ?? 0);
      if (!digitalLimitCheck.allowed) {
        return NextResponse.json(
          {
            error: `Digital product limit reached. Your ${tier} plan allows up to ${digitalLimitCheck.limit} digital products. Upgrade your plan to add more.`,
            code: "DIGITAL_PRODUCT_LIMIT_REACHED",
            limit: digitalLimitCheck.limit,
            current: digitalLimitCheck.current,
          },
          { status: 403 }
        );
      }
    }

    if (!name || !price) return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    if (sale_price && Number(sale_price) >= Number(price)) {
      return NextResponse.json({ error: "Sale price must be less than regular price" }, { status: 400 });
    }
    if (digital_price && Number(digital_price) <= 0) {
      return NextResponse.json({ error: "Digital price must be greater than zero" }, { status: 400 });
    }

    // Validate digital_file_path ownership — must start with vendor's own user id
    if (digital_file_path && !digital_file_path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Invalid digital file path" }, { status: 400 });
    }

    const VALID_CONDITIONS  = ["new", "used", "refurbished"];
    const VALID_FORMATS     = ["Hardcover","Paperback","eBook","Audiobook","CD","DVD","Blu-ray","Vinyl","Digital Download"];

    const { data: product, error } = await admin
      .from("products")
      .insert({
        vendor_id:          user.id,
        name:               name.trim(),
        description:        description?.trim() ?? null,
        price:              Number(price),
        sale_price:         sale_price ? Number(sale_price) : null,
        stock:              Number(stock ?? 0),
        category_id:        category_id || null,
        status:             "inactive",
        moderation_status:  "pending",
        images:             images ?? [],
        condition:          VALID_CONDITIONS.includes(condition) ? condition : "new",
        attributes:         attributes && typeof attributes === "object" ? attributes : {},
        // Books & Media
        media_author:       media_author?.trim() || null,
        media_isbn:         media_isbn?.trim() || null,
        media_publisher:    media_publisher?.trim() || null,
        media_publish_date: media_publish_date || null,
        media_edition:      media_edition?.trim() || null,
        media_pages:        media_pages ? Number(media_pages) : null,
        media_language:     media_language?.trim() || null,
        media_format:       VALID_FORMATS.includes(media_format) ? media_format : null,
        media_genre:        Array.isArray(media_genre) && media_genre.length ? media_genre : null,
        is_digital:         !!is_digital,
        digital_file_path:  is_digital ? (digital_file_path || null) : null,
        digital_price:      is_digital && digital_price ? Number(digital_price) : null,
        digital_file_size:  is_digital && digital_file_size ? Number(digital_file_size) : null,
        created_at:         new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
