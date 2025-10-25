export async function POST(request) {
  try {
    const { name, accountNumber, bankCode } = await request.json();

    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
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
      error: data.message || "Recipient creation failed",
    });
  } catch (error) {
    console.error("Create recipient error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
