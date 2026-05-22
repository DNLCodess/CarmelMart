// Client-side auth query function for React Query.
import { createClient } from "@/lib/supabase/client";

/**
 * Fetches the current authenticated user + their DB profile.
 * Used as the queryFn for the ["auth-user"] React Query key.
 * Uses getUser() — validates with Supabase server, not just local cookie.
 */
export async function fetchAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, role, referral_code, wallet_balance, avatar_url")
    .eq("id", user.id)
    .single();

  const isGuest = user.is_anonymous ?? false;

  if (profileError || !profile) {
    return { user: { id: user.id, email: user.email }, role: null, isGuest };
  }

  return { user: profile, role: profile.role ?? null, isGuest };
}
