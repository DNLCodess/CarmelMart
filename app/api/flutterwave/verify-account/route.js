import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { account_number, account_bank } = await request.json();
    if (!account_number || !account_bank) {
      return NextResponse.json(
        { error: "account_number and account_bank are required" },
        { status: 400 }
      );
    }
    if (!/^\d{10}$/.test(account_number)) {
      return NextResponse.json(
        { error: "Account number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_number, account_bank }),
      signal: AbortSignal.timeout(10_000),
    });

    // Safely parse — Flutterwave occasionally returns plain-text errors
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("[verify-account] Non-JSON response from Flutterwave:", text);
      return NextResponse.json(
        { error: "Bank verification service returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.status !== "success" || !data.data?.account_name) {
      return NextResponse.json(
        { error: "Could not verify bank account. Please check the account number and bank code." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      account_name:   data.data.account_name,
      account_number: data.data.account_number,
    });
  } catch (error) {
    const isTimeout = error.name === "TimeoutError" || error.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Bank verification timed out. Please try again." : error.message },
      { status: 500 }
    );
  }
}
