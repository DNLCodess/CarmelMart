import { NextResponse } from "next/server";

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function POST(request) {
  try {
    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Verify transaction with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.status === "success" && data.data.status === "successful") {
      return NextResponse.json({
        success: true,
        data: {
          amount: data.data.amount,
          currency: data.data.currency,
          transaction_id: data.data.id,
          tx_ref: data.data.tx_ref,
          flw_ref: data.data.flw_ref,
          customer: {
            email: data.data.customer.email,
            name: data.data.customer.name,
          },
          charged_amount: data.data.charged_amount,
          payment_type: data.data.payment_type,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed",
          message: data.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during verification",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
