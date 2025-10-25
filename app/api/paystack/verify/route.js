export async function POST(request) {
  try {
    const { reference } = await request.json();

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.status && data.data.status === "success") {
      return Response.json({
        success: true,
        data: data.data,
      });
    }

    return Response.json({
      success: false,
      error: "Payment verification failed",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
