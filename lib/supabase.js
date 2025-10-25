import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const authHelpers = {
  signUp: async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },
};

// Database helpers
export const dbHelpers = {
  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    return { data, error };
  },

  createUserProfile: async (userData) => {
    const { data, error } = await supabase
      .from("users")
      .insert([userData])
      .select()
      .single();
    return { data, error };
  },

  updateUserProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    return { data, error };
  },

  getVendorProfile: async (userId) => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("user_id", userId)
      .single();
    return { data, error };
  },

  createVendorProfile: async (vendorData) => {
    const { data, error } = await supabase
      .from("vendors")
      .insert([vendorData])
      .select()
      .single();
    return { data, error };
  },

  updateVendorProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();
    return { data, error };
  },

  createPayment: async (paymentData) => {
    const { data, error } = await supabase
      .from("payments")
      .insert([paymentData])
      .select()
      .single();
    return { data, error };
  },

  updatePayment: async (reference, updates) => {
    const { data, error } = await supabase
      .from("payments")
      .update(updates)
      .eq("reference", reference)
      .select()
      .single();
    return { data, error };
  },

  createReferral: async (referralData) => {
    const { data, error } = await supabase
      .from("referrals")
      .insert([referralData])
      .select()
      .single();
    return { data, error };
  },

  getReferralByCode: async (code) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("referral_code", code)
      .single();
    return { data, error };
  },

  getReferrals: async (userId) => {
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", userId);
    return { data, error };
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    return { data, error };
  },

  getAllVendors: async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*, users(email, phone)")
      .order("created_at", { ascending: false });
    return { data, error };
  },

  getAllPayments: async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    return { data, error };
  },
};
