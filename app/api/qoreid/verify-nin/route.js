import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rateLimiter";

export async function POST(request) {
  try {
    // Require authentication — prevents unauthenticated credit consumption
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 NIN verifications per user per hour
    const { allowed, retryAfter } = rateLimit(`nin:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return Response.json(
        { success: false, error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Parse request body
    const { nin, firstName, lastName } = await request.json();

    // ✅ Validate inputs
    if (!nin) {
      return Response.json(
        { success: false, error: "NIN is required" },
        { status: 400 }
      );
    }

    if (!/^\d{11}$/.test(nin)) {
      return Response.json(
        { success: false, error: "NIN must be exactly 11 digits" },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      return Response.json(
        { success: false, error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const namePattern = /^[a-zA-Z\s'-]+$/;
    if (!namePattern.test(firstName) || !namePattern.test(lastName)) {
      return Response.json(
        { success: false, error: "Invalid name format" },
        { status: 400 }
      );
    }

    // ✅ Environment variables
    const clientId = process.env.QOREID_CLIENT_ID;
    const clientSecret = process.env.QOREID_CLIENT_SECRET;
    const baseUrl = process.env.QOREID_BASE_URL || "https://api.qoreid.com";

    if (!clientId || !clientSecret) {
      console.error("QoreID credentials missing");
      return Response.json(
        { success: false, error: "Verification service not configured" },
        { status: 500 }
      );
    }

    // ✅ Step 1: Get access token
    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: { accept: "text/plain", "content-type": "application/json" },
      body: JSON.stringify({
        clientId: String(clientId),
        secret: String(clientSecret),
      }),
    });

    const tokenText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      return Response.json(
        { success: false, error: "Authorization failed", details: tokenText },
        { status: 401 }
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return Response.json(
        { success: false, error: "Invalid token response from QoreID" },
        { status: 502 }
      );
    }

    const accessToken = tokenData.access_token || tokenData.accessToken;
    if (!accessToken) {
      return Response.json(
        { success: false, error: "No access token in response" },
        { status: 502 }
      );
    }

    // ✅ Step 2: Call QoreID NIN verification endpoint
    const verifyUrl = `${baseUrl}/v1/ng/identities/nin/${encodeURIComponent(
      nin
    )}`;

    const payload = {
      firstname: firstName.toUpperCase(),
      lastname: lastName.toUpperCase(),
    };


    const apiResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = apiResponse.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await apiResponse.json()
      : null;


    if (!apiResponse.ok) {
      return Response.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "Verification service error. Please try again later.",
        },
        { status: apiResponse.status }
      );
    }

    // ✅ Step 3: Handle verified result
    if (data?.status?.status === "verified") {
      // Mark vendor as NIN-verified server-side — never trust the client to do this
      const admin = createAdminClient();
      await admin
        .from("vendors")
        .update({
          nin_verified: true,
          nin_data: {
            first_name: data.summary?.firstname || firstName,
            last_name: data.summary?.lastname || lastName,
            nin,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return Response.json({
        success: true,
        verified: true,
        data: {
          nin,
          firstName: data.summary?.firstname || firstName,
          lastName: data.summary?.lastname || lastName,
          middleName: data.summary?.middlename || null,
          fullName: data.summary?.fullname || `${firstName} ${lastName}`,
          dateOfBirth: data.summary?.birthdate || null,
          gender: data.summary?.gender || null,
          photo: data.summary?.photo || null,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // ❌ Not verified
    return Response.json(
      {
        success: false,
        verified: false,
        error: data?.status?.message || "NIN verification failed",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("NIN verification error:", error);
    return Response.json(
      {
        success: false,
        verified: false,
        error: error.message || "Unexpected error during verification.",
      },
      { status: 500 }
    );
  }
}
