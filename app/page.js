"use client";

import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search,
  ShoppingBag,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/UI/Button";
import { categories, featuredProducts, topVendors } from "@/lib/data";
import HeroSection from "@/components/shared/home/hero";
import CategoriesSection from "@/components/shared/home/categories";

export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen bg-white">
      <HeroSection />

      {/* Categories Section - Modern Grid */}
      <CategoriesSection />

      {/* Featured Products - Magazine Style */}
      <section className="py-20 bg-accent-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Trending Now
              </h2>
              <p className="text-lg text-gray-600">
                Most popular products this week
              </p>
            </div>
            <Link href="/shop">
              <Button variant="ghost" className="hidden sm:flex">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
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
                    {/* Product Image */}
                    <div className="relative h-72 overflow-hidden bg-gray-100">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.badge && (
                        <div className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          {product.badge}
                        </div>
                      )}
                      {/* <button className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white">
                        <svg
                          className="w-5 h-5 text-gray-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button> */}
                    </div>

                    {/* Product Info */}
                    <div className="p-5">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {product.vendor}
                      </p>
                      {/* <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors min-h-12">
                        {product.name}
                      </h3> */}

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {product.rating}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          ({product.reviews})
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          ₦{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-400 line-through">
                            ₦{product.originalPrice.toLocaleString()}
                          </span>
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
                View All Products
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Vendors - Premium Design */}
      <section className="py-20 bg-linear-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Vendors
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Shop from Nigeria&apos;s most trusted and verified sellers
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topVendors.map((vendor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/vendor/${vendor.name
                    .toLowerCase()
                    .replace(/ /g, "-")}`}
                >
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group">
                    {/* Vendor Banner */}
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={vendor.image}
                        alt={vendor.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
                    </div>

                    {/* Vendor Info */}
                    <div className="p-6 relative -mt-8">
                      <div className="w-16 h-16 rounded-xl bg-white shadow-lg mb-4 flex items-center justify-center border-4 border-white">
                        <div className="w-14 h-14 rounded-lg overflow-hidden">
                          <Image
                            src={vendor.image}
                            alt={vendor.name}
                            width={56}
                            height={56}
                            className="object-cover"
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {vendor.name}
                        </h3>
                        {vendor.verified && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {vendor.description}
                      </p>

                      <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold text-gray-900">
                              {vendor.rating}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {vendor.sales} sales
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {vendor.products}
                          </div>
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

      {/* CTA Section - Full Width Banner

      {/* CTA Section - Full Width Banner */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=80"
            alt="Shopping"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-primary/95 to-accent/95"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Your Shopping Journey Today
            </h2>
            <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of satisfied customers and verified vendors on
              Nigeria&apos;s most trusted marketplace
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button
                  variant="white"
                  size="lg"
                  className="w-full sm:w-auto text-[--color-primary] hover:bg-gray-50"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-white text-white hover:bg-white/10"
                >
                  Browse Products
                </Button>
              </Link>
            </div>

            {/* Mini Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-white/20">
              <div>
                <div className="text-3xl font-bold mb-1">850+</div>
                <div className="text-sm opacity-80">Verified Vendors</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">12.5K</div>
                <div className="text-sm opacity-80">Products Available</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">45K+</div>
                <div className="text-sm opacity-80">Happy Customers</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Get Exclusive Deals & Updates
          </h3>
          <p className="text-gray-600 mb-8">
            Subscribe to our newsletter and never miss out on special offers
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-6 py-3 rounded-full border border-gray-200 focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/10 outline-none"
            />
            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="sm:px-8 text-black"
            >
              Subscribe
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
