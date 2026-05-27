// Server-only. Import only in Server Components, Server Actions, Route Handlers.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

/**
 * Returns the current user with their profile from the DB.
 * Uses getUser() — validates JWT with Supabase. Never use getSession() server-side.
 * Role is always read from the database, never from JWT claims.
 */
export async function getServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, role, status, referral_code, wallet_balance, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) return { id: user.id, email: user.email, role: null };
  return profile;
}

/**
 * Requires authenticated user. Redirects to /login if not authenticated.
 * Pass currentPath to redirect back after login.
 */
export async function requireAuth(currentPath = "") {
  const user = await getServerUser();
  if (!user) {
    redirect(currentPath ? `/login?from=${encodeURIComponent(currentPath)}` : "/login");
  }
  return user;
}

/**
 * Requires admin role. Redirects to /login if unauthenticated, /unauthorized if not admin.
 * Role is read from the DB — not from JWT claims.
 */
export async function requireAdmin() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/unauthorized");
  if (user.status === "suspended" || user.status === "banned") redirect("/suspended");
  return user;
}

/**
 * Requires vendor role AND admin-approved verification_status.
 * Redirects if unauthenticated, not a vendor, suspended/banned, or KYC not yet approved.
 * Admins bypass the verification check so they can view the portal for support purposes.
 */
export async function requireVendor() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role !== "vendor" && user.role !== "admin") redirect("/unauthorized");
  if (user.status === "suspended" || user.status === "banned") redirect("/suspended");

  // Admins can access the vendor portal without a vendors row
  if (user.role === "admin") return user;

  // Verify the vendor has been KYC-approved — prevents portal access before admin review
  const admin = createAdminClient();
  const { data: vendor } = await admin
    .from("vendors")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!vendor || vendor.verification_status !== "verified") {
    redirect("/vendor-pending");
  }

  return user;
}

/**
 * Requires rider role.
 * Used to protect the /rider/* portal.
 * Suspended or banned riders are blocked.
 */
export async function requireRider() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role !== "rider") redirect("/unauthorized");
  if (user.status === "suspended" || user.status === "banned") redirect("/suspended");
  return user;
}
