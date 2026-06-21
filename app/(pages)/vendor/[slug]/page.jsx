"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star, ShoppingCart, CheckCircle, Package,
  TrendingUp, Grid3X3, List, Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

const BLUR_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

async function fetchVendorStore(slug) {
  const r = await fetch(`/api/vendors/${slug}`);
  if (!r.ok) throw new Error("Vendor not found");
  return r.json();
}

function Stars({ rating = 0 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function VendorStorePage() {
  const { slug }  = useParams();
  const [view, setView] = useState("grid");
  const addItem   = useCartStore((s) => s.addItem);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-store", slug],
    queryFn:  () => fetchVendorStore(slug),
    staleTime: 120_000,
    retry: false,
  });

  const vendor   = data?.vendor   ?? null;
  const products = data?.products ?? [];

  const handleAddToCart = (product) => {
    addItem({
      productId: product.id,
      vendorId:  vendor?.id ?? null,
      name:      product.name,
      price:     product.sale_price ?? product.price,
      image:     product.image,
      quantity:  1,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: vendor?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor not found</h1>
          <p className="text-gray-500 mb-6">This store doesn&apos;t exist or is no longer active.</p>
          <Link href="/shop" className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const bannerImage = vendor?.image ?? "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-64 bg-gray-200 overflow-hidden">
        <Image
          src={bannerImage}
          alt={vendor?.name ?? "Vendor store"}
          fill
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL={BLUR_URL}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Vendor profile card ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 -mt-12 relative z-10 mb-8">
          {isLoading ? (
            <div className="flex items-center gap-5 animate-pulse">
              <div className="w-20 h-20 rounded-2xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ) : vendor ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
                {vendor.image ? (
                  <Image
                    src={vendor.image}
                    alt={vendor.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    placeholder="blur"
                    blurDataURL={BLUR_URL}
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-primary">
                    {vendor.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
                  {vendor.verified && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                  {vendor.tier !== "free" && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full capitalize">
                      {vendor.tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span>{vendor.productCount} products</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span>{vendor.orderCount} sales</span>
                  </div>
                  {vendor.memberSince && (
                    <span className="text-gray-400 text-xs">
                      Member since {new Date(vendor.memberSince).getFullYear()}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleShare}
                className="shrink-0 p-2.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                aria-label="Share store"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Products ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900">
            Products{!isLoading && <span className="text-sm font-normal text-gray-500 ml-1">({products.length})</span>}
          </h2>
          <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
            <button onClick={() => setView("grid")} className={`p-2.5 transition-colors ${view === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`} aria-label="Grid view">
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} className={`p-2.5 transition-colors ${view === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`} aria-label="List view">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-12">
            {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No products listed yet.</p>
          </div>
        ) : (
          <div className={`pb-12 ${view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" : "space-y-4"}`}>
            {products.map((product) =>
              view === "grid" ? (
                <motion.div key={product.id} whileHover={{ y: -4 }} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <Link href={`/product/${product.id}`}>
                    <div className="relative h-52 overflow-hidden bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          placeholder="blur"
                          blurDataURL={BLUR_URL}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-12 h-12" />
                        </div>
                      )}
                      {/* Mobile: persistent cart button */}
                      <button
                        onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                        disabled={!product.in_stock}
                        className="sm:hidden absolute bottom-2 right-2 w-9 h-9 flex items-center justify-center bg-primary text-white rounded-full shadow-lg disabled:opacity-40 active:scale-95 transition-opacity"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                      {/* Desktop: hover overlay */}
                      <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                          disabled={!product.in_stock}
                          className="flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="w-4 h-4" /> {product.in_stock ? "Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-primary">{product.name}</h3>
                    </Link>
                    {(product.avg_rating > 0) && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Stars rating={product.avg_rating} />
                        <span className="text-xs text-gray-400">({product.review_count})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ₦{(product.sale_price ?? product.price).toLocaleString()}
                      </span>
                      {product.sale_price && (
                        <span className="text-xs text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
                  <Link href={`/product/${product.id}`} className="shrink-0">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} fill className="object-cover" placeholder="blur" blurDataURL={BLUR_URL} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-primary mb-1">{product.name}</h3>
                    </Link>
                    {(product.avg_rating > 0) && (
                      <div className="flex items-center gap-1 mb-1">
                        <Stars rating={product.avg_rating} />
                        <span className="text-xs text-gray-400">({product.review_count})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">₦{(product.sale_price ?? product.price).toLocaleString()}</span>
                      {product.sale_price && (
                        <span className="text-xs text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.in_stock}
                    className="shrink-0 self-center flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> {product.in_stock ? "Add" : "Out"}
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
