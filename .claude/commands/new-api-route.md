# /new-api-route

Scaffold a new Next.js App Router API route for CarmelMart with Supabase integration.

## Instructions

Create the route at `app/api/[path]/route.js` based on the user's description.

### API Route Template
```js
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";   // per-request, reads cookies
import { createAdminClient } from "@/lib/supabase/admin"; // bypasses RLS, server-only

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Auth check — getUser() validates JWT with Supabase. Never use getSession().
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Role check — always read role from DB, never from JWT claims
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "vendor") { // adjust role as needed
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Validate input
    const { fieldName } = body;
    if (!fieldName) {
      return NextResponse.json({ success: false, error: "fieldName is required" }, { status: 400 });
    }

    // 3. Business logic + DB operations
    // Use adminClient for operations that need to bypass RLS
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("table_name")
      .insert([{ ...body, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API route name] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Webhook Route Template (Flutterwave / QoreID)
```js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Verify webhook signature (CRITICAL for security)
    const verifHash = request.headers.get("verif-hash"); // Flutterwave
    if (verifHash !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = await request.json();
    console.log("Webhook event:", event.event, event.data?.tx_ref);

    switch (event.event) {
      case "charge.completed":
        if (event.data.status === "successful") {
          await handleSuccessfulPayment(event.data);
        }
        break;
      case "transfer.completed":
        await handleTransferCompleted(event.data);
        break;
      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleSuccessfulPayment(data) {
  // ALWAYS re-verify server-side — never trust webhook amount blindly
  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${data.id}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const verified = await verifyRes.json();
  if (verified.data?.status !== "successful") return;

  // Update DB
  await supabase.from("payments").update({ status: "completed" }).eq("reference", data.tx_ref);
}
```

### Rules to Follow
1. Always use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) on the server
2. Always verify auth for protected routes using `supabase.auth.getUser(token)`
3. Always verify webhook signatures before processing
4. Always re-verify payment amounts server-side — never trust client-reported amounts
5. Return consistent shape: `{ success: true, data }` or `{ success: false, error: string }`
6. Log errors with `console.error("[route name] error:", error)` for debugging
7. Use `status: 400` for validation errors, `status: 401` for auth, `status: 500` for server errors
8. Never expose sensitive keys or full error stacks to the client

### Nigerian Payment Reference Format
```js
const generateRef = (prefix = "CM") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
// e.g. CM-1700000000000-A3B2X9Y
```

Now create the API route based on: **$ARGUMENTS**
