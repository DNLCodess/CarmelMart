import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Next/server mock ──────────────────────────────────────────────────────────
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({ status: init?.status ?? 200, _data: data }),
  },
}));

// ── Supabase mock factory ─────────────────────────────────────────────────────
// Returns a chainable builder that resolves to { data, error } at query end.
function makeQueryBuilder(result) {
  const builder = {
    select:   vi.fn().mockReturnThis(),
    insert:   vi.fn().mockReturnThis(),
    update:   vi.fn().mockReturnThis(),
    delete:   vi.fn().mockReturnThis(),
    upsert:   vi.fn().mockReturnThis(),
    eq:       vi.fn().mockReturnThis(),
    neq:      vi.fn().mockReturnThis(),
    in:       vi.fn().mockReturnThis(),
    gte:      vi.fn().mockReturnThis(),
    order:    vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
    single:   vi.fn().mockResolvedValue(result),
    // terminal — awaiting the builder itself resolves the result
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function makeAdminClient(tableResults = {}) {
  return {
    from: vi.fn((table) => makeQueryBuilder(tableResults[table] ?? { data: null, error: null })),
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
  };
}

let adminClientMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => adminClientMock),
}));

vi.mock("@/lib/subscription", () => ({
  checkProductLimit:        vi.fn(() => ({ allowed: true })),
  checkDigitalProductLimit: vi.fn(() => ({ allowed: true })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeRequest(body) {
  return { json: async () => body };
}

function makeParams(id) {
  return { params: Promise.resolve({ id }) };
}

// ── POST /api/vendor/products ──────────────────────────────────────────────────

describe("POST /api/vendor/products — variant handling", () => {
  let POST;

  beforeEach(async () => {
    vi.resetModules();

    adminClientMock = makeAdminClient();

    // profile check → vendor
    adminClientMock.from = vi.fn((table) => {
      if (table === "users") {
        const b = makeQueryBuilder({ data: { role: "vendor" }, error: null });
        b.single = vi.fn().mockResolvedValue({ data: { role: "vendor" }, error: null });
        return b;
      }
      if (table === "vendors") {
        const b = makeQueryBuilder({ data: { subscription_tier: "free" }, error: null });
        b.single = vi.fn().mockResolvedValue({ data: { subscription_tier: "free" }, error: null });
        return b;
      }
      if (table === "products") {
        // For the product count query (head: true)
        const countBuilder = makeQueryBuilder({ count: 0, error: null });
        // For the insert query
        const insertBuilder = makeQueryBuilder({
          data: { id: "new-product-id", name: "Test" },
          error: null,
        });
        insertBuilder.select = vi.fn().mockReturnThis();
        insertBuilder.single = vi.fn().mockResolvedValue({
          data: { id: "new-product-id", name: "Test" },
          error: null,
        });
        // Return insert builder by default; count builder is used via .select({head:true}) chain
        return {
          select: vi.fn((fields, opts) => {
            if (opts?.head) return countBuilder;
            return insertBuilder;
          }),
          insert: vi.fn().mockReturnValue(insertBuilder),
        };
      }
      if (table === "product_variants") {
        const b = makeQueryBuilder({ data: [], error: null });
        b.insert = vi.fn().mockResolvedValue({ data: [], error: null });
        return b;
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    const mod = await import("@/app/api/vendor/products/route");
    POST = mod.POST;
  });

  it("returns 400 when category_id is missing", async () => {
    const res = await POST(makeRequest({ name: "Shirt", price: 5000 }));
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/category/i);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ price: 5000, category_id: "cat-1" }));
    expect(res.status).toBe(400);
  });

  it("accepts variant_type='none' and creates product without variant insert", async () => {
    const variantInsertSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    adminClientMock.from = vi.fn((table) => {
      if (table === "product_variants") {
        const b = makeQueryBuilder({ data: [], error: null });
        b.insert = variantInsertSpy;
        return b;
      }
      // default fallback for other tables
      if (table === "users") {
        const b = makeQueryBuilder({ data: { role: "vendor" }, error: null });
        b.single = vi.fn().mockResolvedValue({ data: { role: "vendor" }, error: null });
        return b;
      }
      if (table === "vendors") {
        const b = makeQueryBuilder({ data: { subscription_tier: "free" }, error: null });
        b.single = vi.fn().mockResolvedValue({ data: { subscription_tier: "free" }, error: null });
        return b;
      }
      if (table === "products") {
        const insertBuilder = makeQueryBuilder({ data: { id: "pid" }, error: null });
        insertBuilder.select = vi.fn().mockReturnThis();
        insertBuilder.single = vi.fn().mockResolvedValue({ data: { id: "pid" }, error: null });
        return {
          select: vi.fn((_, opts) => opts?.head ? makeQueryBuilder({ count: 0 }) : insertBuilder),
          insert: vi.fn().mockReturnValue(insertBuilder),
        };
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    // Re-import with fresh mocks
    vi.resetModules();
    const { POST: freshPOST } = await import("@/app/api/vendor/products/route");
    await freshPOST(makeRequest({ name: "T-Shirt", price: 5000, category_id: "cat-1", variant_type: "none" }));
    expect(variantInsertSpy).not.toHaveBeenCalled();
  });
});

// ── PATCH /api/vendor/products/[id] — variant handling ────────────────────────

describe("PATCH /api/vendor/products/[id] — variant handling", () => {
  let PATCH;
  let variantDeleteSpy;
  let variantInsertSpy;

  beforeEach(async () => {
    vi.resetModules();

    variantDeleteSpy = vi.fn().mockReturnThis();
    variantInsertSpy = vi.fn().mockResolvedValue({ data: [], error: null });

    adminClientMock = {
      from: vi.fn((table) => {
        if (table === "users") {
          const b = makeQueryBuilder({ data: { role: "vendor" }, error: null });
          b.select = vi.fn().mockReturnThis();
          b.eq    = vi.fn().mockReturnThis();
          b.single = vi.fn().mockResolvedValue({ data: { role: "vendor" }, error: null });
          return b;
        }
        if (table === "products") {
          const existing = makeQueryBuilder({
            data: { moderation_status: "pending", status: "inactive" },
            error: null,
          });
          existing.single = vi.fn().mockResolvedValue({
            data: { moderation_status: "pending", status: "inactive" },
            error: null,
          });
          const updateBuilder = makeQueryBuilder({ data: {}, error: null });
          return {
            select: vi.fn().mockReturnValue(existing),
            update: vi.fn().mockReturnValue(updateBuilder),
          };
        }
        if (table === "product_variants") {
          const b = makeQueryBuilder({ data: [], error: null });
          b.delete = vi.fn().mockReturnValue({
            eq: variantDeleteSpy.mockResolvedValue({ error: null }),
          });
          b.insert = variantInsertSpy;
          return b;
        }
        return makeQueryBuilder({ data: null, error: null });
      }),
    };

    const mod = await import("@/app/api/vendor/products/[id]/route");
    PATCH = mod.PATCH;
  });

  it("deletes existing variants and re-inserts when variant_type='variants'", async () => {
    const variants = [
      { combination: { color: "Red",  size: "M" }, stock: 10, price: 5000 },
      { combination: { color: "Blue", size: "L" }, stock: 5,  price: 5000 },
    ];
    await PATCH(
      makeRequest({ name: "Shirt", price: 5000, category_id: "cat-1", variant_type: "variants", variants }),
      makeParams("prod-1")
    );
    expect(variantDeleteSpy).toHaveBeenCalled();
    expect(variantInsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ product_id: "prod-1", combination: { color: "Red",  size: "M" } }),
        expect.objectContaining({ product_id: "prod-1", combination: { color: "Blue", size: "L" } }),
      ])
    );
  });

  it("deletes variants (no re-insert) when switching to variant_type='none'", async () => {
    await PATCH(
      makeRequest({ name: "Shirt", price: 5000, category_id: "cat-1", variant_type: "none" }),
      makeParams("prod-1")
    );
    expect(variantDeleteSpy).toHaveBeenCalled();
    expect(variantInsertSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when category_id is missing", async () => {
    const res = await PATCH(makeRequest({ name: "Shirt", price: 5000 }), makeParams("prod-1"));
    expect(res.status).toBe(400);
  });
});
