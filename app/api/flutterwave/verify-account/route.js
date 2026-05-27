import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const res = await fetch("https://api.flutterwave.com/v3/resolve_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_number, account_bank }),
      signal: AbortSignal.timeout(10_000),
    });

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
