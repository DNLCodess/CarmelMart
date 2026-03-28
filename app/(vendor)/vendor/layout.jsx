// Server layout — enforces vendor authentication server-side.
// Renders the shared vendor sidebar shell around all /vendor/* pages.
import { requireVendor } from "@/lib/session";
import VendorShell from "@/components/shared/vendor/VendorShell";

export const metadata = { title: "Vendor Portal — CarmelMart" };

export default async function VendorLayout({ children }) {
  await requireVendor(); // redirects to /login if not vendor
  return <VendorShell>{children}</VendorShell>;
}
