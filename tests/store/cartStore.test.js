import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/store/cartStore";

// Reset store state before every test so tests don't bleed into each other
beforeEach(() => {
  useCartStore.setState({ items: [] });
});

// ── makeCartKey logic ──────────────────────────────────────────────────────────

describe("cartKey generation", () => {
  it("non-variant item has cartKey equal to productId", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "T-Shirt", price: 5000, vendorId: "v1" });
    const [item] = useCartStore.getState().items;
    expect(item.cartKey).toBe("prod-1");
  });

  it("variant item has cartKey equal to productId::variantId", () => {
    useCartStore.getState().addItem({
      productId:          "prod-1",
      variantId:          "var-red-m",
      variantCombination: { color: "Red", size: "M" },
      name:               "T-Shirt",
      price:              5000,
    });
    const [item] = useCartStore.getState().items;
    expect(item.cartKey).toBe("prod-1::var-red-m");
  });
});

// ── addItem — basic ────────────────────────────────────────────────────────────

describe("addItem — basic behaviour", () => {
  it("adds an item to an empty cart", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "Cap", price: 1500 });
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("stores all expected fields on the item", () => {
    useCartStore.getState().addItem({
      productId:  "prod-1",
      vendorId:   "vendor-a",
      name:       "Sneakers",
      price:      12000,
      image:      "/img.jpg",
      quantity:   2,
      isDigital:  false,
      deliveryFormat: "physical",
    });
    const item = useCartStore.getState().items[0];
    expect(item.productId).toBe("prod-1");
    expect(item.name).toBe("Sneakers");
    expect(item.price).toBe(12000);
    expect(item.quantity).toBe(2);
    expect(item.variantId).toBeNull();
    expect(item.variantCombination).toBeNull();
  });

  it("defaults quantity to 1 when not provided", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "Bag", price: 3000 });
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("defaults variantId and variantCombination to null when not provided", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "Bag", price: 3000 });
    const item = useCartStore.getState().items[0];
    expect(item.variantId).toBeNull();
    expect(item.variantCombination).toBeNull();
  });
});

// ── addItem — same item deduplication ─────────────────────────────────────────

describe("addItem — deduplication", () => {
  it("increments quantity when the same non-variant item is added twice", () => {
    const add = () => useCartStore.getState().addItem({ productId: "prod-1", name: "Shirt", price: 4000, deliveryFormat: "physical" });
    add(); add();
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("increments quantity when the same variant item is added twice", () => {
    const add = () => useCartStore.getState().addItem({
      productId:  "prod-1",
      variantId:  "var-blue-l",
      name:       "Shirt",
      price:      4000,
      quantity:   1,
    });
    add(); add();
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("replaces format and price (not quantity) when non-variant item switches delivery format", () => {
    useCartStore.getState().addItem({ productId: "prod-d", name: "eBook", price: 1000, deliveryFormat: "physical", quantity: 3 });
    useCartStore.getState().addItem({ productId: "prod-d", name: "eBook", price: 800,  deliveryFormat: "digital",  quantity: 1 });
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].deliveryFormat).toBe("digital");
    expect(items[0].price).toBe(800);
    expect(items[0].quantity).toBe(3); // quantity kept from original
  });
});

// ── addItem — variant isolation ────────────────────────────────────────────────

describe("addItem — variant isolation", () => {
  it("treats same product with different variantIds as separate cart items", () => {
    useCartStore.getState().addItem({ productId: "prod-1", variantId: "var-red-m",  name: "Shirt", price: 5000 });
    useCartStore.getState().addItem({ productId: "prod-1", variantId: "var-blue-l", name: "Shirt", price: 5000 });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("variant item and non-variant item with same productId are separate entries", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "Shirt", price: 5000 });
    useCartStore.getState().addItem({ productId: "prod-1", variantId: "var-red-m", name: "Shirt", price: 5200 });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("three different variants of same product are all kept separately", () => {
    ["var-a", "var-b", "var-c"].forEach((vid) =>
      useCartStore.getState().addItem({ productId: "prod-1", variantId: vid, name: "Dress", price: 6000 })
    );
    expect(useCartStore.getState().items).toHaveLength(3);
  });

  it("stores variantCombination on the item", () => {
    const combination = { color: "Red", size: "M" };
    useCartStore.getState().addItem({ productId: "p1", variantId: "v1", variantCombination: combination, name: "Shirt", price: 5000 });
    expect(useCartStore.getState().items[0].variantCombination).toEqual(combination);
  });
});

// ── removeItem ─────────────────────────────────────────────────────────────────

describe("removeItem", () => {
  it("removes the correct non-variant item by cartKey", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "A", price: 1000 });
    useCartStore.getState().addItem({ productId: "prod-2", name: "B", price: 2000 });
    useCartStore.getState().removeItem("prod-1");
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("prod-2");
  });

  it("removes the correct variant item without affecting other variants", () => {
    useCartStore.getState().addItem({ productId: "p1", variantId: "v-red", name: "Shirt", price: 5000 });
    useCartStore.getState().addItem({ productId: "p1", variantId: "v-blue", name: "Shirt", price: 5000 });
    useCartStore.getState().removeItem("p1::v-red");
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe("v-blue");
  });

  it("removing a non-existent cartKey leaves the cart unchanged", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "A", price: 1000 });
    useCartStore.getState().removeItem("ghost-key");
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

// ── updateQuantity ─────────────────────────────────────────────────────────────

describe("updateQuantity", () => {
  it("updates quantity for a non-variant item", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "A", price: 1000 });
    useCartStore.getState().updateQuantity("prod-1", 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("updates quantity for a variant item using its full cartKey", () => {
    useCartStore.getState().addItem({ productId: "p1", variantId: "v1", name: "S", price: 4000 });
    useCartStore.getState().updateQuantity("p1::v1", 3);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("removes item when quantity is updated to 0", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "A", price: 1000 });
    useCartStore.getState().updateQuantity("prod-1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removes item when quantity is updated to a negative number", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "A", price: 1000 });
    useCartStore.getState().updateQuantity("prod-1", -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("does not affect other items when updating one variant's quantity", () => {
    useCartStore.getState().addItem({ productId: "p1", variantId: "v-red",  name: "S", price: 4000 });
    useCartStore.getState().addItem({ productId: "p1", variantId: "v-blue", name: "S", price: 4000 });
    useCartStore.getState().updateQuantity("p1::v-red", 7);
    const { items } = useCartStore.getState();
    expect(items.find((i) => i.variantId === "v-red").quantity).toBe(7);
    expect(items.find((i) => i.variantId === "v-blue").quantity).toBe(1); // unchanged
  });
});

// ── clearCart ──────────────────────────────────────────────────────────────────

describe("clearCart", () => {
  it("empties all items", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "A", price: 100 });
    useCartStore.getState().addItem({ productId: "p2", name: "B", price: 200 });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

// ── Mixed variant + non-variant cart ──────────────────────────────────────────

describe("mixed cart scenarios", () => {
  it("correctly tracks variant and non-variant items for the same product in parallel", () => {
    useCartStore.getState().addItem({ productId: "prod-1", name: "Shirt",          price: 5000 });
    useCartStore.getState().addItem({ productId: "prod-1", variantId: "v-red",  name: "Shirt", price: 5500 });
    useCartStore.getState().addItem({ productId: "prod-2", name: "Trousers",        price: 8000 });
    useCartStore.getState().addItem({ productId: "prod-1", variantId: "v-blue", name: "Shirt", price: 5500 });

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.cartKey)).toEqual(
      expect.arrayContaining(["prod-1", "prod-1::v-red", "prod-2", "prod-1::v-blue"])
    );
  });
});
