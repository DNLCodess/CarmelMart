// Cart state — client-side persisted with Zustand.
// Auth state is managed by AuthProvider + React Query (lib/auth-context.jsx).
// Use useAuth() from @/lib/auth-context to read user, role, isAuthenticated, etc.
// Do NOT add user/session/role here — that causes stale data bugs.
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Item shape:
// { cartKey, productId, variantId, variantCombination, vendorId, name, price,
//   quantity, image, isDigital, deliveryFormat }
// cartKey = unique per cart entry — derived as `${productId}::${variantId}` for
// variant items, or just `${productId}` for non-variant items.

function makeCartKey(productId, variantId) {
  return variantId ? `${productId}::${variantId}` : productId;
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) =>
        set((state) => {
          const cartKey = makeCartKey(product.productId, product.variantId ?? null);
          const existing = state.items.find((i) => i.cartKey === cartKey);

          if (existing) {
            if (!product.variantId && existing.deliveryFormat !== product.deliveryFormat) {
              // Non-variant item: different format → replace format + price, keep quantity
              return {
                items: state.items.map((i) =>
                  i.cartKey === cartKey
                    ? { ...i, price: product.price, deliveryFormat: product.deliveryFormat }
                    : i,
                ),
              };
            }
            // Same format (or variant): increment quantity
            return {
              items: state.items.map((i) =>
                i.cartKey === cartKey
                  ? { ...i, quantity: i.quantity + (product.quantity ?? 1) }
                  : i,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...product,
                cartKey,
                variantId:          product.variantId ?? null,
                variantCombination: product.variantCombination ?? null,
                quantity:           product.quantity ?? 1,
              },
            ],
          };
        }),

      // cartKey is the primary key for mutations — pass item.cartKey from UI.
      // Passing just productId still works for non-variant items (their cartKey === productId).
      removeItem: (cartKey) =>
        set((state) => ({ items: state.items.filter((i) => i.cartKey !== cartKey) })),

      updateQuantity: (cartKey, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.cartKey !== cartKey)
              : state.items.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: "carmelmart-cart" },
  ),
);
