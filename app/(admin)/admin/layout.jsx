import { requireAdmin } from "@/lib/session";
import AdminShell from "@/components/shared/admin/AdminShell";

export const metadata = { title: "Admin Console — CarmelMart" };

export default async function AdminLayout({ children }) {
  await requireAdmin(); // server-side — redirects if not admin
  return <AdminShell>{children}</AdminShell>;
}
