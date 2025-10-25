import { create } from "zustand";

export const useUserStore = create((set) => ({
  profile: null,
  vendorProfile: null,
  referrals: [],
  isLoading: false,

  setProfile: (profile) => set({ profile }),
  setVendorProfile: (vendorProfile) => set({ vendorProfile }),
  setReferrals: (referrals) => set({ referrals }),
  setLoading: (isLoading) => set({ isLoading }),

  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),

  updateVendorProfile: (updates) =>
    set((state) => ({
      vendorProfile: state.vendorProfile
        ? { ...state.vendorProfile, ...updates }
        : null,
    })),
}));
