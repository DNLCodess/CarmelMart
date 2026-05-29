import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import KycResumeClient from "./KycResumeClient";

export const metadata = { title: "Complete Vendor Registration — CarmelMart" };

export default async function VendorKycPage() {
  const user = await requireAuth("/vendor-kyc");

  if (user.role !== "vendor") redirect("/unauthorized");

  const admin = createAdminClient();
  const { data: vendor } = await admin
    .from("vendors")
    .select("payment_verified, verification_status")
    .eq("id", user.id)
    .single();

  // Payment already done — go to the "under review" waiting room
  if (vendor?.payment_verified) redirect("/vendor-pending");

  // Already fully verified — go straight to dashboard
  if (vendor?.verification_status === "verified") redirect("/vendor/dashboard");

  return <KycResumeClient userId={user.id} email={user.email} />;
}
