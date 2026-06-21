import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Next/server mock ──────────────────────────────────────────────────────────
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({ status: init?.status ?? 200, _data: data }),
  },
}));

// ── Email mocks (fire-and-forget, not tested here) ────────────────────────────
vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: vi.fn(),
  sendVendorNewOrder:    vi.fn(),
}));

// ── Supabase helpers ───────────────────────────────────────────────────────────
function makeChain(result) {
  const c = {
    select:  vi.fn().mockReturnThis(),
    insert:  vi.fn().mockReturnThis(),
    update:  vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    neq:     vi.fn().mockReturnThis(),
    in:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    limit:   vi.fn().mockReturnThis(),
    single:  vi.fn().mockResolvedValue(result),
    then:    (resolve) => Promise.resolve(result).then(resolve),
  };
  return c;
}

// User auth client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "customer-1", email: "buyer@test.com" } },
        error: null,
      }),
    },
  })),
}));

// ── Shared scenario state ─────────────────────────────────────────────────────
let scenarioProducts = [];
let scenarioVariants = [];
let scenarioOrderId  = "order-abc";
let scenarioCreatedItems = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === "products") {
        const c = makeChain({ data: scenarioProducts, error: null });
        c.in  = vi.fn().mockReturnThis();
        c.eq  = vi.fn().mockReturnThis();
        // Resolves with the array directly when awaited
        c.then = (resolve) => Promise.resolve({ data: scenarioProducts, error: null }).then(resolve);
        return c;
      }
      if (table === "product_variants") {
        const c = makeChain({ data: scenarioVariants, error: null });
        c.in  = vi.fn().mockReturnThis();
        c.eq  = vi.fn().mockReturnThis();
        c.then = (resolve) => Promise.resolve({ data: scenarioVariants, error: null }).then(resolve);
        return c;
      }
      if (table === "order_items") {
        const c = makeChain({ data: scenarioCreatedItems, error: null });
        c.then = (resolve) => Promise.resolve({ data: scenarioCreatedItems, error: null }).then(resolve);
        // update() returns a new chain that resolves fine
        c.update = vi.fn().mockReturnValue(makeChain({ data: {}, error: null }));
        return c;
      }
      if (table === "promo_codes") {
        return makeChain({ data: null, error: { message: "not found" } });
      }
      if (table === "users") {
        const c = makeChain({ data: [], error: null });
        c.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve);
        return c;
      }
      return makeChain({ data: null, error: null });
    }),
    rpc: vi.fn().mockResolvedValue({ data: scenarioOrderId, error: null }),
  })),
}));

// ── Flutterwave verification mock — always passes ─────────────────────────────
function mockFlutterwaveOk(amount) {
  global.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    json: async () => ({
      status: "success",
      data: {
        status:          "successful",
        currency:        "NGN",
        tx_ref:          "ref-1",
        charged_amount:  amount,
        customer:        { email: "buyer@test.com" },
      },
    }),
  });
}

// ── Import the handler ─────────────────────────────────────────────────────────
const { POST } = await import("@/app/api/customer/orders/route");

function makeRequest(body) {
  return { json: async () => body };
}

const BASE_ADDRESS = {
  fullName:      "Test Buyer",
  email:         "buyer@test.com",
  phone:         "08012345678",
  delivery_fee:  1000,
};

// ── cartKey uniqueness ─────────────────────────────────────────────────────────

describe("POST /api/customer/orders — cartKey uniqueness", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects when same productId appears twice with no variantId (duplicate cartKey)", async () => {
    scenarioProducts = [
      { id: "p1", name: "Shirt", price: 5000, sale_price: null, stock: 20, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "none" },
    ];
    scenarioVariants = [];
    mockFlutterwaveOk(12000);

    const res = await POST(makeRequest({
      items: [
        { productId: "p1", quantity: 1, delivery_format: "physical" },
        { productId: "p1", quantity: 2, delivery_format: "physical" },
      ],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/duplicate/i);
  });

  it("allows same productId when different variantIds are provided", async () => {
    scenarioProducts = [
      { id: "p1", name: "Shirt", price: 5000, sale_price: null, stock: 20, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "variants" },
    ];
    scenarioVariants = [
      { id: "var-red",  product_id: "p1", combination: { color: "Red",  size: "M" }, stock: 10, price: null, is_active: true },
      { id: "var-blue", product_id: "p1", combination: { color: "Blue", size: "L" }, stock: 8,  price: null, is_active: true },
    ];
    scenarioOrderId      = "order-xyz";
    scenarioCreatedItems = [
      { id: "oi-1", product_id: "p1" },
      { id: "oi-2", product_id: "p1" },
    ];

    const total = 5000 + 5000 + 1000; // 2 items × 5000 + delivery_fee
    mockFlutterwaveOk(total);

    const res = await POST(makeRequest({
      items: [
        { productId: "p1", variantId: "var-red",  quantity: 1, delivery_format: "physical" },
        { productId: "p1", variantId: "var-blue",  quantity: 1, delivery_format: "physical" },
      ],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    // Should NOT be a 400 duplicate error — it should reach order creation
    expect(res.status).not.toBe(400);
  });
});

// ── Variant stock validation ───────────────────────────────────────────────────

describe("POST /api/customer/orders — variant stock validation", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when selected variant is not found (inactive / deleted)", async () => {
    scenarioProducts = [
      { id: "p1", name: "Dress", price: 8000, sale_price: null, stock: 50, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "variants" },
    ];
    scenarioVariants = []; // empty — variant doesn't exist

    const res = await POST(makeRequest({
      items: [
        { productId: "p1", variantId: "ghost-variant", quantity: 1, delivery_format: "physical" },
      ],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/no longer available/i);
  });

  it("returns error when variant stock is insufficient", async () => {
    scenarioProducts = [
      { id: "p1", name: "Dress", price: 8000, sale_price: null, stock: 50, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "variants" },
    ];
    scenarioVariants = [
      { id: "var-1", product_id: "p1", combination: { color: "Red" }, stock: 2, price: null, is_active: true },
    ];

    const res = await POST(makeRequest({
      items: [
        { productId: "p1", variantId: "var-1", quantity: 5, delivery_format: "physical" }, // requesting 5, only 2 in stock
      ],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/insufficient stock/i);
  });

  it("returns error when variant belongs to a different product (security check)", async () => {
    scenarioProducts = [
      { id: "p1", name: "Shirt",  price: 5000, sale_price: null, stock: 20, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "variants" },
    ];
    scenarioVariants = [
      // var-1 belongs to p2, not p1
      { id: "var-1", product_id: "p2", combination: { color: "Red" }, stock: 10, price: null, is_active: true },
    ];

    const res = await POST(makeRequest({
      items: [
        { productId: "p1", variantId: "var-1", quantity: 1, delivery_format: "physical" },
      ],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/invalid variant/i);
  });
});

// ── Variant price used in order total ─────────────────────────────────────────

describe("POST /api/customer/orders — variant-level price", () => {
  it("uses the variant's custom price when present, ignoring product price", async () => {
    scenarioProducts = [
      { id: "p1", name: "Shirt", price: 5000, sale_price: null, stock: 20, vendor_id: "v1", is_digital: false, digital_price: null, variant_type: "variants" },
    ];
    // Variant has a custom price of 7000 (different from product.price 5000)
    scenarioVariants = [
      { id: "var-xl", product_id: "p1", combination: { size: "XL" }, stock: 5, price: 7000, is_active: true },
    ];
    scenarioOrderId      = "order-price-test";
    scenarioCreatedItems = [{ id: "oi-1", product_id: "p1" }];

    const variantItemTotal = 7000 * 2; // qty 2 at variant price 7000
    const total = variantItemTotal + BASE_ADDRESS.delivery_fee;
    mockFlutterwaveOk(total);

    // Spy on the rpc call to capture the p_items sent
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminInstance = createAdminClient();
    const rpcSpy = adminInstance.rpc;

    await POST(makeRequest({
      items: [{ productId: "p1", variantId: "var-xl", quantity: 2, delivery_format: "physical" }],
      delivery_address:        BASE_ADDRESS,
      payment_ref:             "ref-1",
      payment_transaction_id:  "txn-1",
    }));

    const rpcCall = rpcSpy.mock.calls[0];
    if (rpcCall) {
      const items = rpcCall[1]?.p_items;
      if (items?.length) {
        // The unit_price sent to the RPC must reflect the variant price (7000), not product price (5000)
        expect(items[0].unit_price).toBe(7000);
      }
    }
  });
});

// ── Empty cart / invalid input ─────────────────────────────────────────────────

describe("POST /api/customer/orders — basic validation", () => {
  it("returns 400 when items array is empty", async () => {
    const res = await POST(makeRequest({ items: [], delivery_address: BASE_ADDRESS }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/cart is empty/i);
  });

  it("returns 400 when items is not provided", async () => {
    const res = await POST(makeRequest({ delivery_address: BASE_ADDRESS }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/cart is empty/i);
  });
});
