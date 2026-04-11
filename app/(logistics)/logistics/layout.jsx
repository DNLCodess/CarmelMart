import { requireLogisticsAdmin } from "@/lib/session";
import LogisticsShell from "@/components/shared/logistics/LogisticsShell";

export const metadata = { title: "Logistics Portal — CarmelMart" };

export default async function LogisticsLayout({ children }) {
  await requireLogisticsAdmin();
  return <LogisticsShell>{children}</LogisticsShell>;
}
