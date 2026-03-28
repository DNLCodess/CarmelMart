"use client";

import { motion } from "framer-motion";
import { Star, ShoppingCart, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import { useCartStore } from "@/store/authStore";

async function fetchFeatured() {
  const r = await fetch("/api/products?featured=true&limit=8");
  return r.json();
}

export default function FeaturedProductsSection() {
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: fetchFeatured,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.products ?? [];

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      vendorId:  product.vendor_id ?? null,
      name:      product.name,
      price:     product.sale_price ?? product.price,
      image:     product.images?.[0] ?? product.image ?? "",
      quantity:  1,
    });
    toast.success(`${product.name} added to cart`);
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-b from-accent-light/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Trending Now</h2>
              <p className="text-lg text-gray-600">Most popular products this week</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-72 bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-6 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-accent-light/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Trending Now</h2>
            <p className="text-lg text-gray-600">Most popular products this week</p>
          </div>
          <Link href="/shop">
            <Button variant="ghost" className="hidden sm:flex">
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link href={`/product/${product.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300">
                  <div className="relative h-72 overflow-hidden bg-gray-100">
                    <Image
                      src={product.images?.[0] ?? product.image ?? "https://placehold.co/400x400"}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.sale_price && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        Sale
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        className="flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors duration-200"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">{product.vendor_name || "CarmelMart"}</p>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium text-gray-900">{product.avg_rating ?? "4.5"}</span>
                      {product.review_count > 0 && (
                        <span className="text-sm text-gray-400">({product.review_count})</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ₦{(product.sale_price ?? product.price).toLocaleString()}
                      </span>
                      {product.sale_price && (
                        <span className="text-sm text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 sm:hidden">
          <Link href="/shop">
            <Button variant="outline" size="lg" className="w-full max-w-sm">
              View All Products <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
