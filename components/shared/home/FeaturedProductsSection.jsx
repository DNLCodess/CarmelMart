"use client";

import { motion } from "framer-motion";
import { Star, ShoppingCart, ArrowRight, Flame, BadgeCheck, Truck, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

async function fetchFeatured() {
  const r = await fetch("/api/products?featured=true&per_page=8");
  const data = await r.json();
  console.log("[CarmelMart] /api/products featured response:", JSON.stringify(data?.products?.map(p => ({
    id: p.id, name: p.name, price: p.price, sale_price: p.sale_price,
    salePrice: p.salePrice, images: p.images,
  }))));
  return data;
}

const RANK_STYLES = [
  { badge: "bg-yellow-400 text-gray-900",  label: "#1",  glow: "shadow-yellow-400/30" },
  { badge: "bg-slate-300 text-gray-900",   label: "#2",  glow: "shadow-slate-300/20"  },
  { badge: "bg-orange-400 text-white",     label: "#3",  glow: "shadow-orange-400/20" },
];

function ProductCard({ product, rank, index }) {
  const addItem = useCartStore((s) => s.addItem);
  const rankStyle = RANK_STYLES[rank] ?? null;

  const displayPrice  = product.salePrice ?? product.sale_price ?? product.price;
  const originalPrice = (product.salePrice || product.sale_price) ? product.price : null;
  const discount      = originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;
  const image = Array.isArray(product.images) ? product.images[0] : (product.image ?? null);
  const vendorName = product.vendor?.name ?? product.vendor_name ?? null;
  const verified   = product.vendor?.verified ?? product.vendor_verified ?? false;
  const rating     = product.avgRating ?? product.avg_rating ?? 0;
  const reviews    = product.reviewCount ?? product.review_count ?? 0;
  const sold       = product.soldCount  ?? product.sold_count  ?? 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: product.id, vendorId: product.vendor?.id ?? null, name: product.name, price: displayPrice, image, quantity: 1 });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      viewport={{ once: true }}
      className="group relative snap-center shrink-0 w-[220px] sm:w-auto"
    >
      <Link href={`/product/${product.id}`}>
        <div className="relative bg-white rounded-3xl overflow-hidden border border-white/10 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 hover:-translate-y-1">

          {/* Rank badge */}
          {rankStyle && (
            <div className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full ${rankStyle.badge} flex items-center justify-center text-xs font-black shadow-lg ${rankStyle.glow}`}>
              {rankStyle.label}
            </div>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-3 right-3 z-10 bg-rose-500 text-white text-[11px] font-black px-2 py-1 rounded-full">
              -{discount}%
            </div>
          )}

          {/* Image */}
          <div className="relative h-52 sm:h-56 overflow-hidden bg-gray-100">
            {image
              ? <Image src={image} alt={product.name} fill className="object-cover group-hover:scale-107 transition-transform duration-500" />
              : <div className="w-full h-full bg-gray-100" />
            }
            {/* Cart hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-2 bg-white text-gray-900 text-xs font-bold px-5 py-2.5 rounded-full shadow-xl hover:bg-primary hover:text-white transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            {vendorName && (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[11px] text-gray-400 font-medium truncate">{vendorName}</span>
                {verified && <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" />}
              </div>
            )}
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 leading-snug">{product.name}</h3>

            {/* Rating + sold */}
            <div className="flex items-center gap-1.5 mb-3">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-800">{rating > 0 ? rating.toFixed(1) : "New"}</span>
              {reviews > 0 && <span className="text-xs text-gray-400">({reviews})</span>}
              {sold > 0 && <span className="text-xs text-gray-400 ml-auto flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{sold} sold</span>}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-gray-900">
                {displayPrice != null ? `₦${displayPrice.toLocaleString()}` : "—"}
              </span>
              {originalPrice != null && (
                <span className="text-xs text-gray-400 line-through">₦{originalPrice.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const SkeletonCard = () => (
  <div className="bg-white/5 rounded-3xl overflow-hidden animate-pulse shrink-0 w-[220px] sm:w-auto">
    <div className="h-52 bg-white/10" />
    <div className="p-4 space-y-2.5">
      <div className="h-2.5 bg-white/10 rounded w-1/3" />
      <div className="h-3.5 bg-white/10 rounded" />
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-5 bg-white/10 rounded w-1/2" />
    </div>
  </div>
);

export default function FeaturedProductsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: fetchFeatured,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.products ?? [];

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Trending</span>
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              This Week&apos;s{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-400">
                Hot Picks
              </span>
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Ranked by sales, ratings, and customer love
            </p>
          </div>
          <Link
            href="/shop?sort=popular"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors group"
          >
            See all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Product grid — horizontal scroll on mobile, 4-col grid on desktop */}
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none scrollbar-none">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  rank={i}
                  index={i}
                />
              ))
          }
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/shop?sort=popular"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3 rounded-full border border-white/20 transition-colors text-sm"
          >
            See All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
