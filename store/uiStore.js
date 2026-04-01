// UI preferences and local-first state — client-side persisted with Zustand.
// User profile and vendor profile are fetched with React Query (useAuth / useQuery).
// This store holds only lightweight client-side UI preferences that don't need server sync.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      // Wishlist (local-first; stores full product snapshots for offline display)
      wishlist: [], // Product[]
      addToWishlist: (product) =>
        set((state) =>
          state.wishlist.some((w) => w?.id === product?.id || w === product?.id)
            ? state
            : { wishlist: [...state.wishlist, product] },
        ),
      removeFromWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.filter((w) => (w?.id ?? w) !== productId),
        })),
      isWishlisted: (productId) => (state) =>
        state.wishlist.some((w) => (w?.id ?? w) === productId),

      // Recently viewed products (local only)
      recentlyViewed: [], // productId[]
      addRecentlyViewed: (productId) =>
        set((state) => ({
          recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 20),
        })),

      // Delivery location (persisted; pre-fills checkout state selector)
      deliveryLocation: "Lagos",
      setDeliveryLocation: (state) => set({ deliveryLocation: state }),

      // UI preferences
      prefersDarkMode: false,
      setPrefersDarkMode: (val) => set({ prefersDarkMode: val }),
    }),
    { name: "carmelmart-ui" },
  ),
);
