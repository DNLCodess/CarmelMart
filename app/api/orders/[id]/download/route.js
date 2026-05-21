import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/orders/[id]/download?item=[order_item_id]
// Verifies order ownership + payment, then redirects to a 1-hour signed URL.
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item");

    if (!itemId) {
      return NextResponse.json({ error: "item query param required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify order belongs to this user and is paid
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, payment_status, customer_id")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment required before download" }, { status: 402 });
    }

    // Fetch the specific order item and confirm it's digital
    const { data: item, error: itemErr } = await admin
      .from("order_items")
      .select("id, products ( id, is_digital, digital_file_path )")
      .eq("id", itemId)
      .eq("order_id", orderId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const product = item.products;

    if (!product?.is_digital) {
      return NextResponse.json({ error: "Item is not a digital product" }, { status: 400 });
    }

    if (!product?.digital_file_path) {
      return NextResponse.json({ error: "Download file not available" }, { status: 404 });
    }

    // Generate a 1-hour signed URL from the private bucket
    const { data: signedData, error: signErr } = await admin
      .storage
      .from("digital-products")
      .createSignedUrl(product.digital_file_path, 3600);

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.redirect(signedData.signedUrl);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
