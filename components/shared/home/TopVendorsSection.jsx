import { Star, BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

async function getFeaturedVendors() {
  const supabase = createAdminClient();

  const { data: vendorRows, error } = await supabase
    .from("vendors")
    .select("id, business_name, description, image, logo_image, banner_image, slug, verification_status")
    .eq("verification_status", "verified")
    .limit(8);

  if (error || !vendorRows?.length) return [];

  const vendorIds = vendorRows.map((v) => v.id);
  const { data: products } = await supabase
    .from("products")
    .select("vendor_id, images")
    .in("vendor_id", vendorIds)
    .eq("status", "active");

  const productsByVendor = {};
  for (const product of products ?? []) {
    if (!productsByVendor[product.vendor_id]) productsByVendor[product.vendor_id] = [];
    productsByVendor[product.vendor_id].push(product);
  }

  return vendorRows.map((vendor) => {
    const vendorProducts = productsByVendor[vendor.id] ?? [];
    const sampleImage =
      vendorProducts.find((product) => Array.isArray(product.images) && product.images.length > 0)
        ?.images[0] ?? null;

    return {
      id: vendor.id,
      name: vendor.business_name,
      description: vendor.description,
      verified: true,
      productCount: vendorProducts.length,
      image: vendor.image ?? sampleImage,
      logoImage: vendor.logo_image,
      bannerImage: vendor.banner_image ?? sampleImage,
      slug:
        vendor.slug ??
        vendor.business_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ??
        vendor.id,
    };
  });
}

export default async function TopVendorsSection() {
  const vendors = await getFeaturedVendors();

  if (vendors.length === 0) return null;

  return (
    <section className="py-20 bg-linear-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Vendors</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Shop from Nigeria&apos;s most trusted and verified sellers</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendor/${vendor.slug ?? vendor.id}`}>
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group">
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={vendor.bannerImage || vendor.image || "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=600"}
                    alt={vendor.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width:1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                </div>

                <div className="p-6 relative -mt-8">
                  <div className="w-16 h-16 rounded-xl bg-white shadow-lg mb-4 flex items-center justify-center border-4 border-white overflow-hidden">
                    <Image
                      src={vendor.logoImage || vendor.image || "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=120"}
                      alt={vendor.name}
                      width={56}
                      height={56}
                      className="object-cover w-14 h-14 rounded-lg"
                    />
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{vendor.name}</h3>
                    {vendor.verified && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <BadgeCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {vendor.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{vendor.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold text-gray-900">4.8</span>
                      </div>
                      <p className="text-xs text-gray-500">0 sales</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{vendor.productCount}</div>
                      <p className="text-xs text-gray-500">Products</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
