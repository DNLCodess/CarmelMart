"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, ShoppingCart, Star, ChevronRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

function useCountdown(endsAt) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();

    const calc = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [endsAt]);

  return timeLeft;
}

function Digit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary-dark text-white font-bold text-xl sm:text-2xl w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function StockBar({ stock, sold }) {
  const total = (stock ?? 0) + (sold ?? 0);
  const pct   = total > 0 ? Math.round(((sold ?? 0) / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct > 70 ? "bg-red-500" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {(stock ?? 0) <= 5
          ? <span className="text-red-500 font-semibold">Only {stock} left!</span>
          : <span>{sold ?? 0} sold</span>
        }
      </p>
    </div>
  );
}

export default function FlashSaleSection() {
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery({
    queryKey: ["flash-sale"],
    queryFn: () => fetch("/api/flash-sales").then((r) => r.json()),
    staleTime: 60_000,
    retry: false,
  });

  const sale     = data?.sale ?? null;
  const products = data?.products ?? [];
  const { h, m, s } = useCountdown(sale?.endsAt ?? null);

  // Hide section when there's no live flash sale and we're done loading
  if (!isLoading && !sale) return null;

  // Show skeleton while loading
  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-white/20 rounded-xl mb-8 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const handleAddToCart = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: item.id,
      vendorId:  null,
      name:      item.name,
      price:     item.salePrice,
      image:     item.image,
      quantity:  1,
    });
    toast.success(`${item.name} added to cart!`);
  };

  const discountLabel = sale.discountType === "percentage"
    ? `Up to ${sale.discountValue}% OFF`
    : `₦${sale.discountValue.toLocaleString()} OFF`;

  return (
    <section className="py-12 sm:py-16 bg-primary relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {sale.title}
              </h2>
              <p className="text-accent text-sm font-medium">
                {sale.description ?? discountLabel} — Today only
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent shrink-0" />
            <span className="text-white/60 text-sm mr-2">Ends in:</span>
            <div className="flex items-center gap-2">
              <Digit value={h} label="hrs" />
              <span className="text-white font-bold text-xl mb-4">:</span>
              <Digit value={m} label="min" />
              <span className="text-white font-bold text-xl mb-4">:</span>
              <Digit value={s} label="sec" />
            </div>
          </div>

          <Link
            href="/shop?sort=flash_sale"
            className="ml-auto hidden sm:flex items-center gap-1 text-accent text-sm font-semibold hover:text-accent-light transition-colors whitespace-nowrap"
          >
            See all deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {products.map((item, index) => {
            const discount = Math.round(((item.price - item.salePrice) / item.price) * 100);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group"
              >
                <Link href={`/product/${item.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 relative">
                    <div className="absolute top-2 left-2 z-10 bg-accent text-white text-xs font-extrabold px-2 py-1 rounded-lg">
                      -{discount}%
                    </div>

                    <div className="relative h-36 sm:h-44 overflow-hidden bg-gray-50">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                          onClick={(e) => handleAddToCart(e, item)}
                          className="w-full flex items-center justify-center gap-1.5 bg-primary-dark text-white text-xs font-bold py-2 rounded-full hover:bg-accent transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> Add to Cart
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-xs text-gray-500 mb-1 truncate">{item.vendor}</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2">
                        {item.name}
                      </p>
                      {item.rating > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold text-gray-900">{item.rating.toFixed(1)}</span>
                          {item.reviews > 0 && <span className="text-xs text-gray-400">({item.reviews})</span>}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-gray-900">₦{item.salePrice.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-through">₦{item.price.toLocaleString()}</p>
                      <StockBar stock={item.stock} sold={item.sold} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile "See all" */}
        <div className="text-center mt-6 sm:hidden">
          <Link
            href="/shop?sort=flash_sale"
            className="inline-flex items-center gap-2 text-accent font-semibold text-sm"
          >
            See all flash deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
