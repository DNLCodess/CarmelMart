// Cart state — client-side persisted with Zustand.
// Auth state is managed by AuthProvider + React Query (lib/auth-context.jsx).
// Use useAuth() from @/lib/auth-context to read user, role, isAuthenticated, etc.
// Do NOT add user/session/role here — that causes stale data bugs.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      // Item shape: { productId, vendorId, name, price, quantity, image, isDigital, deliveryFormat }
      // deliveryFormat: "digital" | "physical" — set at product page when customer picks format
      items: [],

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);
          if (existing) {
            if (existing.deliveryFormat === product.deliveryFormat) {
              // Same format: increment quantity
              return {
                items: state.items.map((i) =>
                  i.productId === product.productId
                    ? { ...i, quantity: i.quantity + (product.quantity ?? 1) }
                    : i,
                ),
              };
            }
            // Different format: replace format + price, keep quantity
            return {
              items: state.items.map((i) =>
                i.productId === product.productId
                  ? { ...i, price: product.price, deliveryFormat: product.deliveryFormat }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: product.quantity ?? 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: "carmelmart-cart" },
  ),
);
