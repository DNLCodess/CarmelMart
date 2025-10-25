export async function POST(request) {
  try {
    const { amount, recipientCode, reason } = await request.json();

    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: reason || "Referral bonus",
      }),
    });

    const data = await response.json();

    if (data.status) {
      return Response.json({
        success: true,
        data: data.data,
      });
    }

    return Response.json({
      success: false,
      error: data.message || "Transfer failed",
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
