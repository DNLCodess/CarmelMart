import { requireRider } from "@/lib/session";
import RiderShell from "@/components/shared/rider/RiderShell";

export const metadata = {
  title: "Rider Portal — CarmelMart",
  manifest: "/rider-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CM Rider",
  },
};

export const viewport = {
  themeColor: "#059669",
};

export default async function RiderLayout({ children }) {
  await requireRider();
  return <RiderShell>{children}</RiderShell>;
}
