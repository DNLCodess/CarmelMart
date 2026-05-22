import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/session";

export default async function DashboardRedirectPage() {
  const user = await getServerUser();

  if (!user) redirect("/login");

  switch (user.role) {
    case "admin":           redirect("/admin/dashboard");
    case "vendor":          redirect("/vendor/dashboard");
    case "logistics_admin": redirect("/logistics/dashboard");
    case "rider":           redirect("/rider/dashboard");
    default:                redirect("/");
  }
}
