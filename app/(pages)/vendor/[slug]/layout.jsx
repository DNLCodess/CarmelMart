import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const admin = createAdminClient();
    const { data: vendor } = await admin
      .from("vendors")
      .select("business_name, business_address, products ( images )")
      .eq("slug", slug)
      .eq("verification_status", "verified")
      .maybeSingle();

    if (!vendor) return { title: "Vendor Store | CarmelMart" };

    const image = vendor.products?.[0]?.images?.[0] ?? null;
    const name  = vendor.business_name;

    return {
      title: `${name} | CarmelMart Vendor`,
      description: `Shop from ${name} on CarmelMart — verified Nigerian vendor. Browse their full product catalogue.`,
      openGraph: {
        title: `${name} | CarmelMart`,
        description: `Explore products from ${name}, a verified vendor on CarmelMart Nigeria.`,
        images: image ? [{ url: image, alt: name }] : [],
        type: "website",
      },
    };
  } catch {
    return { title: "Vendor Store | CarmelMart" };
  }
}

export default function VendorStoreLayout({ children }) { return children; }
