export async function POST(request) {
  try {
    // ---------- 1. Parse & validate ----------
    const { cacNumber } = await request.json();

    if (!cacNumber) {
      return Response.json(
        { success: false, error: "CAC registration number is required" },
        { status: 400 }
      );
    }

    // Accept formats like RC123456, BN200002, IT987654, etc.
    const trimmed = cacNumber.trim().toUpperCase();
    if (!/^[A-Z]{1,10}\d{1,10}$/.test(trimmed)) {
      return Response.json(
        { success: false, error: "Invalid CAC number format" },
        { status: 400 }
      );
    }

    // ---------- 2. Env & token ----------
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

    // Get access token
    const tokenRes = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: { accept: "text/plain", "content-type": "application/json" },
      body: JSON.stringify({
        clientId: String(clientId),
        secret: String(clientSecret),
      }),
    });

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
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

    const accessToken = tokenData.access_token ?? tokenData.accessToken;
    if (!accessToken) {
      return Response.json(
        { success: false, error: "No access token in response" },
        { status: 502 }
      );
    }

    // ---------- 3. Call CAC endpoint ----------
    const verifyUrl = `${baseUrl}/v1/ng/identities/cac-basic`;
    const payload = { regNumber: trimmed };

    console.log("Verifying CAC:", trimmed, "→", verifyUrl);

    const apiRes = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = apiRes.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await apiRes.json()
      : null;

    console.log("QoreID CAC response:", { status: apiRes.status, body: data });

    // ---- CORRECT STATUS CHECK ----
    if (apiRes.status !== 200) {
      return Response.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "CAC verification service error. Please try again later.",
        },
        { status: apiRes.status }
      );
    }

    // ---------- 4. Parse verified result ----------
    // QoreID returns { status: { state: "complete", status: "verified" }, cac: { … } }
    const isVerified = data?.status?.status === "verified" && data?.cac;

    if (isVerified) {
      const cac = data.cac;

      return Response.json({
        success: true,
        verified: true,
        data: {
          cacNumber: trimmed,
          companyName: cac.companyName ?? null,
          registrationNumber: cac.rcNumber ?? trimmed,
          registrationDate: cac.registrationDate ?? null,
          state: cac.state ?? null,
          lga: cac.lga ?? null,
          address: cac.headOfficeAddress ?? cac.branchAddress ?? null,
          status: cac.status ?? null,
          companyType: cac.classification ?? null,
          email: cac.companyEmail ?? null,
          affiliates: cac.affiliates ?? null,
          shareCapital: cac.shareCapital ?? null,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // ---------- 5. Not verified ----------
    return Response.json(
      {
        success: false,
        verified: false,
        error:
          data?.status?.message || data?.message || "CAC verification failed",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("CAC verification error:", error);

    // ---- Development mock ----
    if (process.env.NODE_ENV === "development") {
      return Response.json({
        success: true,
        verified: true,
        data: {
          cacNumber: "BN200002",
          companyName: "DYNAMITE EVENTS SERVICES",
          registrationNumber: "200002",
          registrationDate: "2022-08-04T15:05:12.383+00:00",
          state: "",
          address: "Oxford Street, Abeere",
          status: "ACTIVE",
          companyType: "Business",
          email: "john.doe@gmail.com",
          affiliates: 2,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    return Response.json(
      {
        success: false,
        verified: false,
        error: error.message || "Unexpected error during CAC verification.",
      },
      { status: 500 }
    );
  }
}
