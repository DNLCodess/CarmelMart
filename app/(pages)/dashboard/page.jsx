import { requireAdmin } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata = { title: "Admin Dashboard — CarmelMart" };

async function getAdminStats() {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalVendors },
    { count: pendingKyc },
    { count: totalProducts },
    { count: totalOrders },
    { count: pendingOrders },
    { data: revenueData },
    { data: recentUsers },
    { data: recentVendors },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }).eq("role", "vendor"),
    admin.from("vendors").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    admin.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("orders").select("*", { count: "exact", head: true }),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("payments").select("amount").eq("status", "completed"),
    admin.from("users")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("vendors")
      .select("id, business_name, verification_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const gmv = (revenueData || []).reduce((s, p) => s + (p.amount || 0), 0);

  return {
    totalUsers:    totalUsers ?? 0,
    totalVendors:  totalVendors ?? 0,
    pendingKyc:    pendingKyc ?? 0,
    totalProducts: totalProducts ?? 0,
    totalOrders:   totalOrders ?? 0,
    pendingOrders: pendingOrders ?? 0,
    gmv,
    recentUsers:   recentUsers ?? [],
    recentVendors: recentVendors ?? [],
  };
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const adminName = admin.user_metadata?.first_name
    ? `${admin.user_metadata.first_name} ${admin.user_metadata.last_name ?? ""}`.trim()
    : admin.email?.split("@")[0] ?? "Admin";

  const stats = await getAdminStats();

  return <AdminDashboardClient stats={stats} adminName={adminName} />;
}
