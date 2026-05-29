import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rateLimiter";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 CAC verifications per user per hour
    const { allowed, retryAfter } = rateLimit(`cac:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return Response.json(
        { success: false, error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const { cacNumber } = await request.json();

    if (!cacNumber) {
      return Response.json({ success: false, error: "CAC registration number is required" }, { status: 400 });
    }

    const trimmed = cacNumber.trim().toUpperCase();
    if (!/^[A-Z]{1,10}\d{1,10}$/.test(trimmed)) {
      return Response.json({ success: false, error: "Invalid CAC number format" }, { status: 400 });
    }

    const clientId     = process.env.QOREID_CLIENT_ID;
    const clientSecret = process.env.QOREID_CLIENT_SECRET;
    const baseUrl      = process.env.QOREID_BASE_URL || "https://api.qoreid.com";

    if (!clientId || !clientSecret) {
      console.error("QoreID credentials missing");
      return Response.json({ success: false, error: "Verification service not configured" }, { status: 500 });
    }

    // Get access token
    const tokenRes  = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: { accept: "text/plain", "content-type": "application/json" },
      body: JSON.stringify({ clientId: String(clientId), secret: String(clientSecret) }),
    });

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      return Response.json({ success: false, error: "Authorization failed", details: tokenText }, { status: 401 });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return Response.json({ success: false, error: "Invalid token response from QoreID" }, { status: 502 });
    }

    const accessToken = tokenData.access_token ?? tokenData.accessToken;
    if (!accessToken) {
      return Response.json({ success: false, error: "No access token in response" }, { status: 502 });
    }

    const apiRes = await fetch(`${baseUrl}/v1/ng/identities/cac-basic`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ regNumber: trimmed }),
    });

    const contentType = apiRes.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json") ? await apiRes.json() : null;

    if (apiRes.status !== 200) {
      return Response.json(
        { success: false, error: data?.message || data?.error || "CAC verification service error. Please try again later." },
        { status: apiRes.status }
      );
    }

    const isVerified = data?.status?.status === "verified" && data?.cac;

    if (isVerified) {
      const {
        companyName, rcNumber, registrationDate, state, lga,
        headOfficeAddress, branchAddress, status: cacStatus,
        classification, companyEmail, affiliates, shareCapital,
      } = data.cac;
      const admin = createAdminClient();
      await admin
        .from("vendors")
        .update({ cac_verified: true, cac_number: trimmed, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      return Response.json({
        success: true,
        verified: true,
        data: {
          cacNumber:          trimmed,
          companyName:        companyName       ?? null,
          registrationNumber: rcNumber          ?? trimmed,
          registrationDate:   registrationDate  ?? null,
          state:              state             ?? null,
          lga:                lga               ?? null,
          address:            headOfficeAddress ?? branchAddress ?? null,
          status:             cacStatus         ?? null,
          companyType:        classification    ?? null,
          email:              companyEmail      ?? null,
          affiliates:         affiliates        ?? null,
          shareCapital:       shareCapital      ?? null,
          verifiedAt:         new Date().toISOString(),
        },
      });
    }

    return Response.json(
      { success: false, verified: false, error: data?.status?.message || data?.message || "CAC verification failed" },
      { status: 400 }
    );
  } catch (error) {
    console.error("CAC verification error:", error);

    if (process.env.NODE_ENV === "development") {
      return Response.json({
        success: true, verified: true,
        data: {
          cacNumber: "BN200002", companyName: "DYNAMITE EVENTS SERVICES",
          registrationNumber: "200002", registrationDate: "2022-08-04T15:05:12.383+00:00",
          state: "", address: "Oxford Street, Abeere", status: "ACTIVE",
          companyType: "Business", email: "john.doe@gmail.com",
          affiliates: 2, verifiedAt: new Date().toISOString(),
        },
      });
    }

    return Response.json(
      { success: false, verified: false, error: error.message || "Unexpected error during CAC verification." },
      { status: 500 }
    );
  }
}
