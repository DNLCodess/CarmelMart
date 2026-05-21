import { requireRider } from "@/lib/session";
import RiderShell from "@/components/shared/rider/RiderShell";

export const metadata = { title: "Rider Portal — CarmelMart" };

export default async function RiderLayout({ children }) {
  await requireRider();
  return <RiderShell>{children}</RiderShell>;
}
