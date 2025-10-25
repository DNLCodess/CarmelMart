export async function POST(request) {
  try {
    const { nin } = await request.json();

    // Mock verification for development
    // In production, integrate with actual QoreId API
    const response = await fetch(
      "https://api.qoreid.com/v1/ng/identities/nin",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.QOREID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nin }),
      }
    );

    const data = await response.json();

    if (data.status === "success") {
      return Response.json({
        success: true,
        data: data.data,
      });
    }

    return Response.json({
      success: false,
      error: data.message || "NIN verification failed",
    });
  } catch (error) {
    console.error("NIN verification error:", error);

    // For development/testing, return mock success
    if (process.env.NODE_ENV === "development") {
      return Response.json({
        success: true,
        data: { verified: true },
      });
    }

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
