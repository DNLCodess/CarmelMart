import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import KycResumeClient from "./KycResumeClient";

export const metadata = { title: "Complete Vendor Registration — CarmelMart" };

export default async function VendorKycPage() {
  const user = await requireAuth("/vendor-kyc");

  if (user.role !== "vendor") redirect("/unauthorized");

  const admin = createAdminClient();
  const [{ data: vendor }, { data: profile }] = await Promise.all([
    admin
      .from("vendors")
      .select("payment_verified, verification_status, business_name, address, phone, bank_account_number, bank_name, bank_code, verification_type, nin_verified, cac_verified")
      .eq("id", user.id)
      .single(),
    admin.from("users").select("phone").eq("id", user.id).single(),
  ]);

  // Payment already done — go to the "under review" waiting room
  if (vendor?.payment_verified) redirect("/vendor-pending");

  return (
    <KycResumeClient
      email={user.email}
      phone={vendor?.phone ?? profile?.phone ?? null}
      vendor={vendor ?? null}
    />
  );
}
