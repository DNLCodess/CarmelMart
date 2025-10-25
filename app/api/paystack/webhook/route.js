import { createHmac } from "crypto";
import { dbHelpers } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle different event types
    if (event.event === "charge.success") {
      const { reference, amount, customer } = event.data;

      // Update payment record
      await dbHelpers.updatePayment(reference, {
        status: "success",
      });

      // Process referral if applicable
      // This would be handled based on your business logic
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
