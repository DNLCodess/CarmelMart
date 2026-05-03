"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

async function fetchFeaturedVendors() {
  const r = await fetch("/api/vendors/featured");
  return r.json();
}

export default function TopVendorsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-vendors"],
    queryFn: fetchFeaturedVendors,
    staleTime: 5 * 60 * 1000,
  });

  const vendors = data?.vendors ?? [];

  if (isLoading) {
    return (
      <section className="py-20 bg-linear-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Vendors</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Shop from Nigeria's most trusted and verified sellers</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-40 bg-gray-100" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (vendors.length === 0) return null;

  return (
    <section className="py-20 bg-linear-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Vendors</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Shop from Nigeria's most trusted and verified sellers</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vendors.map((vendor, index) => (
            <motion.div
              key={vendor.id ?? index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Link href={`/vendor/${vendor.slug ?? vendor.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={vendor.banner_image || vendor.image || "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=600"}
                      alt={vendor.business_name ?? vendor.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="p-6 relative -mt-8">
                    <div className="w-16 h-16 rounded-xl bg-white shadow-lg mb-4 flex items-center justify-center border-4 border-white overflow-hidden">
                      <Image
                        src={vendor.logo_image || vendor.image || "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=120"}
                        alt={vendor.business_name ?? vendor.name}
                        width={56}
                        height={56}
                        className="object-cover w-14 h-14 rounded-lg"
                      />
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{vendor.business_name ?? vendor.name}</h3>
                      {vendor.verified && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
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
                          <span className="font-semibold text-gray-900">{vendor.avg_rating ?? "4.8"}</span>
                        </div>
                        <p className="text-xs text-gray-500">{vendor.total_sales ?? 0} sales</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{vendor.product_count ?? 0}</div>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
