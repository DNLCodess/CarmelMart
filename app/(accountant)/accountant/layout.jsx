import { requireAccountant } from "@/lib/session";
import AccountantShell from "@/components/shared/accountant/AccountantShell";

export const metadata = { title: "Finance Portal — CarmelMart" };

export default async function AccountantLayout({ children }) {
  await requireAccountant();
  return <AccountantShell>{children}</AccountantShell>;
}
