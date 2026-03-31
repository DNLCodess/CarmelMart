"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShoppingCart, Star, ChevronRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

// Static flash sale items — replace with API when flash_sales table is populated
const FLASH_ITEMS = [
  {
    id: "fs-1",
    name: "Premium Noise-Cancelling Headphones",
    price: 65000,
    salePrice: 38000,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    vendor: "TechHub Nigeria",
    rating: 4.8,
    reviews: 124,
    stock: 7,
    sold: 43,
  },
  {
    id: "fs-2",
    name: "Smart Fitness Tracker Watch",
    price: 45000,
    salePrice: 22000,
    image: "https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=600&q=80",
    vendor: "FitGear Store",
    rating: 4.7,
    reviews: 203,
    stock: 3,
    sold: 67,
  },
  {
    id: "fs-3",
    name: "Organic Skincare Collection",
    price: 25000,
    salePrice: 14500,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
    vendor: "Beauty Haven",
    rating: 5.0,
    reviews: 156,
    stock: 12,
    sold: 89,
  },
  {
    id: "fs-4",
    name: "Elegant African Print Dress",
    price: 28000,
    salePrice: 16000,
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
    vendor: "Afrique Styles",
    rating: 4.9,
    reviews: 89,
    stock: 5,
    sold: 31,
  },
  {
    id: "fs-5",
    name: "Professional DSLR Camera",
    price: 180000,
    salePrice: 115000,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
    vendor: "Photo Pro NG",
    rating: 4.9,
    reviews: 67,
    stock: 2,
    sold: 18,
  },
  {
    id: "fs-6",
    name: "Gaming Laptop Pro",
    price: 350000,
    salePrice: 249000,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
    vendor: "TechZone Nigeria",
    rating: 4.8,
    reviews: 92,
    stock: 4,
    sold: 22,
  },
];

// End of day countdown target
function getEndOfDayTarget() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  // If we're past 22:00, extend to tomorrow
  if (now.getHours() >= 22) {
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 0);
  }
  return end;
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    function calc() {
      const diff = Math.max(0, target.getTime() - Date.now());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft({ h, m, s });
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

function Digit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-900 text-white font-bold text-xl sm:text-2xl w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function StockBar({ stock, sold }) {
  const total = stock + sold;
  const pct   = total > 0 ? Math.round((sold / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct > 70 ? "bg-red-500" : "bg-orange-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {stock <= 5
          ? <span className="text-red-500 font-semibold">Only {stock} left!</span>
          : <span>Sold: {sold}</span>
        }
      </p>
    </div>
  );
}

export default function FlashSaleSection() {
  const addItem = useCartStore((s) => s.addItem);
  const [target] = useState(getEndOfDayTarget);
  const { h, m, s } = useCountdown(target);

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

  return (
    <section className="py-12 sm:py-16 bg-gray-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Flash Sale</h2>
              <p className="text-orange-400 text-sm font-medium">Up to 50% OFF — Today only</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-gray-400 text-sm mr-2">Ends in:</span>
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
            className="ml-auto hidden sm:flex items-center gap-1 text-orange-400 text-sm font-semibold hover:text-orange-300 transition-colors whitespace-nowrap"
          >
            See all deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {FLASH_ITEMS.map((item, index) => {
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
                    {/* Discount badge */}
                    <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs font-extrabold px-2 py-1 rounded-lg">
                      -{discount}%
                    </div>

                    {/* Image */}
                    <div className="relative h-36 sm:h-44 overflow-hidden bg-gray-50">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
                      />
                      {/* Hover add to cart */}
                      <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                          onClick={(e) => handleAddToCart(e, item)}
                          className="w-full flex items-center justify-center gap-1.5 bg-gray-900 text-white text-xs font-bold py-2 rounded-full hover:bg-orange-500 transition-colors"
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
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-gray-900">{item.rating}</span>
                        <span className="text-xs text-gray-400">({item.reviews})</span>
                      </div>
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
            className="inline-flex items-center gap-2 text-orange-400 font-semibold text-sm"
          >
            See all flash deals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
