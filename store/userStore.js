// User profile and vendor profile are now fetched with React Query (useAuth / useQuery).
// This store holds only lightweight client-side UI preferences that don't need server sync.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      // Wishlist (local-first; sync to DB on login)
      wishlist: [], // productId[]
      addToWishlist: (productId) =>
        set((state) =>
          state.wishlist.includes(productId)
            ? state
            : { wishlist: [...state.wishlist, productId] },
        ),
      removeFromWishlist: (productId) =>
        set((state) => ({ wishlist: state.wishlist.filter((id) => id !== productId) })),
      isWishlisted: (productId) => (state) => state.wishlist.includes(productId),

      // Recently viewed products (local only)
      recentlyViewed: [], // productId[]
      addRecentlyViewed: (productId) =>
        set((state) => ({
          recentlyViewed: [productId, ...state.recentlyViewed.filter((id) => id !== productId)].slice(0, 20),
        })),

      // UI preferences
      prefersDarkMode: false,
      setPrefersDarkMode: (val) => set({ prefersDarkMode: val }),
    }),
    { name: "carmelmart-ui" },
  ),
);
