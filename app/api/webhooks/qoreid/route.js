import { NextResponse } from "next/server";

/**
 * QoreID webhook receiver.
 * Currently logs all events and returns 200 to prevent QoreID from retrying.
 * Extend this when async verification callbacks need to be processed.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    console.log("[QoreID webhook] received event:", JSON.stringify(body));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[QoreID webhook] error:", error.message);
    return NextResponse.json({ received: true });
  }
}
