import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/server so NextResponse.json returns a plain inspectable object
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({
      status: init?.status ?? 200,
      _data: data,
      json: async () => data,
    }),
  },
}));

// Import the handler after the mock is in place
const { POST } = await import("@/app/api/flutterwave/verify-account/route");

function makeRequest(body) {
  return { json: async () => body };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { get: (h) => h === "content-type" ? "application/json" : null },
    json: async () => body,
  };
}

function mockFlutterwaveSuccess(accountName = "JOHN DOE", accountNumber = "0123456789") {
  global.fetch = vi.fn().mockResolvedValueOnce(
    jsonResponse({ status: "success", data: { account_name: accountName, account_number: accountNumber } })
  );
}

function mockFlutterwaveFailure(message = "Invalid account") {
  global.fetch = vi.fn().mockResolvedValueOnce(
    jsonResponse({ status: "error", message })
  );
}

// ─── Input validation ─────────────────────────────────────────────────────────

describe("POST /api/flutterwave/verify-account — input validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.FLUTTERWAVE_SECRET_KEY = "test_secret_key";
  });

  it("returns 400 when account_number is missing", async () => {
    const res = await POST(makeRequest({ account_bank: "044" }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/required/i);
  });

  it("returns 400 when account_bank is missing", async () => {
    const res = await POST(makeRequest({ account_number: "0123456789" }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/required/i);
  });

  it("returns 400 when account_number is fewer than 10 digits", async () => {
    const res = await POST(makeRequest({ account_number: "012345678", account_bank: "044" }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/10 digits/i);
  });

  it("returns 400 when account_number is more than 10 digits", async () => {
    const res = await POST(makeRequest({ account_number: "01234567890", account_bank: "044" }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/10 digits/i);
  });

  it("returns 400 when account_number contains letters", async () => {
    const res = await POST(makeRequest({ account_number: "012345678a", account_bank: "044" }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/10 digits/i);
  });
});

// ─── Flutterwave integration ──────────────────────────────────────────────────

describe("POST /api/flutterwave/verify-account — Flutterwave integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.FLUTTERWAVE_SECRET_KEY = "test_secret_key";
  });

  it("calls Flutterwave resolve_account with the correct payload", async () => {
    mockFlutterwaveSuccess();
    await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.flutterwave.com/v3/accounts/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_secret_key",
        }),
        body: JSON.stringify({ account_number: "0123456789", account_bank: "044" }),
      })
    );
  });

  it("returns account_name and account_number on successful verification", async () => {
    mockFlutterwaveSuccess("JANE DOE", "0123456789");

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(200);
    expect(res._data).toEqual({ account_name: "JANE DOE", account_number: "0123456789" });
  });

  it("returns 400 when Flutterwave status is not success", async () => {
    mockFlutterwaveFailure();

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/could not verify/i);
  });

  it("returns 400 when Flutterwave returns success but account_name is missing", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({ status: "success", data: { account_number: "0123456789" } })
    );

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/could not verify/i);
  });
});

// ─── Error / timeout handling ─────────────────────────────────────────────────

describe("POST /api/flutterwave/verify-account — error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.FLUTTERWAVE_SECRET_KEY = "test_secret_key";
  });

  it("returns 500 with timeout message on AbortError", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValueOnce(abortError);

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(500);
    expect(res._data.error).toMatch(/timed out/i);
  });

  it("returns 500 with timeout message on TimeoutError", async () => {
    const timeoutError = new Error("Timeout");
    timeoutError.name = "TimeoutError";
    global.fetch = vi.fn().mockRejectedValueOnce(timeoutError);

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(500);
    expect(res._data.error).toMatch(/timed out/i);
  });

  it("returns 500 with the error message on unexpected failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network failure"));

    const res = await POST(makeRequest({ account_number: "0123456789", account_bank: "044" }));

    expect(res.status).toBe(500);
    expect(res._data.error).toBe("Network failure");
  });
});
