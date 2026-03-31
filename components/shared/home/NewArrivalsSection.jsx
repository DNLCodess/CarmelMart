"use client";

import { motion } from "framer-motion";
import { PackagePlus, ShoppingCart, Star, ChevronRight, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

// Fallback static data while API is wired up
const STATIC_ARRIVALS = [
  {
    id: "na-1",
    name: "Wireless Noise-Cancelling Earbuds",
    price: 28000,
    salePrice: null,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    vendor: "TechHub Nigeria",
    avgRating: 4.8,
    reviewCount: 12,
    badge: "New",
    category: { name: "Electronics" },
  },
  {
    id: "na-2",
    name: "Premium Ankara Blazer",
    price: 32000,
    salePrice: null,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4468?w=600&q=80",
    vendor: "Afrique Styles",
    avgRating: 5.0,
    reviewCount: 8,
    badge: "New",
    category: { name: "Fashion" },
  },
  {
    id: "na-3",
    name: "Smart Air Purifier",
    price: 55000,
    salePrice: 45000,
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
    vendor: "Home Essentials",
    avgRating: 4.7,
    reviewCount: 5,
    badge: "New",
    category: { name: "Home & Living" },
  },
  {
    id: "na-4",
    name: "Vitamin C Brightening Serum",
    price: 12500,
    salePrice: null,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
    vendor: "Beauty Haven",
    avgRating: 4.9,
    reviewCount: 22,
    badge: "New",
    category: { name: "Beauty" },
  },
  {
    id: "na-5",
    name: "Adjustable Dumbbell Set",
    price: 68000,
    salePrice: 52000,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    vendor: "FitGear Store",
    avgRating: 4.6,
    reviewCount: 18,
    badge: "New",
    category: { name: "Sports" },
  },
  {
    id: "na-6",
    name: "Modern Bamboo Desk Lamp",
    price: 18000,
    salePrice: null,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80",
    vendor: "Home & Office",
    avgRating: 4.5,
    reviewCount: 9,
    badge: "New",
    category: { name: "Home & Living" },
  },
  {
    id: "na-7",
    name: "Women's Ankara Tote Bag",
    price: 14500,
    salePrice: null,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    vendor: "Luxury Collections",
    avgRating: 4.8,
    reviewCount: 34,
    badge: "New",
    category: { name: "Fashion" },
  },
  {
    id: "na-8",
    name: "Men's Running Sneakers",
    price: 24000,
    salePrice: 19500,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    vendor: "FitGear Store",
    avgRating: 4.7,
    reviewCount: 41,
    badge: "New",
    category: { name: "Sports" },
  },
];

async function fetchNewArrivals() {
  const r = await fetch("/api/products?sort=newest&limit=8");
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
}

export default function NewArrivalsSection() {
  const addItem       = useCartStore((s) => s.addItem);
  const wishlist      = useUIStore((s) => s.wishlist);
  const addToWishlist = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);

  const { data } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: fetchNewArrivals,
    staleTime: 5 * 60_000,
  });

  const products = data?.products?.length ? data.products : STATIC_ARRIVALS;

  const handleAddToCart = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: p.id, vendorId: null, name: p.name, price: p.salePrice ?? p.price, image: p.image ?? p.images?.[0], quantity: 1 });
    toast.success(`${p.name} added to cart`);
  };

  const handleWishlist = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    const inList = wishlist.some((w) => w === p.id || w?.id === p.id);
    if (inList) { removeFromWishlist(p.id); toast.success("Removed from wishlist"); }
    else { addToWishlist(p); toast.success("Added to wishlist"); }
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Just Dropped</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">New Arrivals</h2>
            <p className="text-gray-600 mt-1">Fresh products added this week</p>
          </motion.div>
          <Link
            href="/shop?sort=newest"
            className="hidden sm:flex items-center gap-1 text-primary text-sm font-semibold hover:gap-2 transition-all"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.slice(0, 8).map((p, i) => {
            const price   = p.salePrice ?? p.sale_price ?? p.price;
            const origPrice = p.salePrice ? p.price : (p.sale_price ? p.price : null);
            const discount  = origPrice ? Math.round(((origPrice - price) / origPrice) * 100) : null;
            const img = p.image ?? p.images?.[0] ?? null;
            const isWished = wishlist.some((w) => w === p.id || w?.id === p.id);

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                viewport={{ once: true }}
                className="group"
              >
                <Link href={`/product/${p.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      {img && (
                        <Image
                          src={img}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                        />
                      )}
                      {/* New badge */}
                      <span className="absolute top-3 left-3 text-xs font-bold bg-primary text-white px-2.5 py-1 rounded-full">
                        New
                      </span>
                      {discount && (
                        <span className="absolute top-3 right-10 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}
                      {/* Wishlist */}
                      <button
                        onClick={(e) => handleWishlist(e, p)}
                        className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow flex items-center justify-center transition-colors ${isWished ? "bg-red-500 text-white" : "bg-white text-gray-400 hover:text-red-500"}`}
                      >
                        <Heart className={`w-4 h-4 ${isWished ? "fill-current" : ""}`} />
                      </button>
                      {/* Hover CTA */}
                      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                          onClick={(e) => handleAddToCart(e, p)}
                          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-bold py-2.5 rounded-full hover:bg-primary transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {p.category && (
                        <p className="text-xs font-semibold text-primary mb-1">{p.category.name}</p>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2 truncate">{p.vendor?.name ?? p.vendor ?? p.vendor_name}</p>
                      {(p.avgRating ?? p.avg_rating) > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{(p.avgRating ?? p.avg_rating)?.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({p.reviewCount ?? p.review_count})</span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-gray-900">₦{price.toLocaleString()}</span>
                        {origPrice && <span className="text-xs text-gray-400 line-through">₦{origPrice.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="text-center mt-8 sm:hidden">
          <Link href="/shop?sort=newest" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            See all new arrivals <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
