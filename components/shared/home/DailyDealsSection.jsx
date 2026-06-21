"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, ShoppingCart, Star, ChevronRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

async function fetchDeals() {
  const r = await fetch("/api/deals");
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
}

// Countdown to midnight Lagos time
function MidnightCountdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now   = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight - now) / 1000));
      setTimeLeft({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-4 h-4 text-orange-500" />
      <span className="text-xs font-medium text-gray-600">Ends in</span>
      {[timeLeft.h, timeLeft.m, timeLeft.s].map((val, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-md tabular-nums min-w-7 text-center">
            {pad(val)}
          </span>
          {i < 2 && <span className="text-gray-400 font-bold text-xs">:</span>}
        </span>
      ))}
    </div>
  );
}

export default function DailyDealsSection() {
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-deals"],
    queryFn: fetchDeals,
    staleTime: 10 * 60_000,
  });

  const products = data?.products ?? [];

  // Hide section entirely once loaded and empty
  if (!isLoading && products.length === 0) return null;

  const handleAddToCart = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: p.id,
      vendorId:  null,
      name:      p.name,
      price:     p.salePrice,
      image:     p.image ?? "",
      quantity:  1,
    });
    toast.success(`${p.name} added to cart`);
  };

  return (
    <section className="py-12 sm:py-16 bg-linear-to-br from-orange-50 via-white to-red-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4 flex-wrap"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500 text-white">
                <Tag className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Today Only</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Daily Deals</h2>
              </div>
            </div>
            <MidnightCountdown />
          </motion.div>
          <Link
            href="/shop?sort=discount"
            className="hidden sm:flex items-center gap-1 text-orange-500 text-sm font-semibold hover:gap-2 transition-all"
          >
            View all deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Skeleton while loading */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product grid */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="group"
              >
                <Link href={`/product/${p.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-orange-200 transition-all duration-300">
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                          <Tag className="w-12 h-12" />
                        </div>
                      )}

                      {/* Discount badge — prominent */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <span className="text-sm font-extrabold bg-orange-500 text-white px-2.5 py-1 rounded-xl shadow">
                          -{p.discount}%
                        </span>
                        {p.stock > 0 && p.stock <= 10 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock <= 3 ? "bg-red-500 text-white" : "bg-amber-400 text-white"}`}>
                            {p.stock <= 3 ? `Last ${p.stock}!` : `${p.stock} left`}
                          </span>
                        )}
                      </div>

                      {/* Mobile: persistent cart button */}
                      <button
                        onClick={(e) => handleAddToCart(e, p)}
                        disabled={p.stock === 0}
                        className="sm:hidden absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-full shadow disabled:opacity-40 active:scale-95 transition-opacity"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      {/* Desktop: slide-up add-to-cart */}
                      <div className="hidden sm:block absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                          onClick={(e) => handleAddToCart(e, p)}
                          disabled={p.stock === 0}
                          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white text-xs font-bold py-2.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {p.category && (
                        <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider mb-1">
                          {p.category.name}
                        </p>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-500 transition-colors">
                        {p.name}
                      </h3>
                      {p.avgRating > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{p.avgRating.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({p.reviewCount})</span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-orange-500">
                          ₦{p.salePrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          ₦{p.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-green-600 mt-0.5">
                        Save ₦{(p.price - p.salePrice).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="text-center mt-8 sm:hidden">
          <Link
            href="/shop?sort=discount"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500"
          >
            View all deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
