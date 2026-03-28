"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Star, ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw,
  ChevronLeft, ChevronRight, Store, CheckCircle, XCircle,
  Minus, Plus, ArrowLeft, Package, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/authStore";
import { useUIStore } from "@/store/userStore";

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchProduct(id) {
  const r = await fetch(`/api/products/${id}`);
  if (!r.ok) throw new Error("Product not found");
  return r.json();
}

async function fetchRelated(categoryId) {
  if (!categoryId) return { products: [] };
  const r = await fetch(`/api/products?category_id=${categoryId}&per_page=4`);
  return r.json();
}

async function fetchReviews(productId) {
  const r = await fetch(`/api/products/${productId}/reviews?limit=10`);
  if (!r.ok) return { reviews: [], total: 0 };
  return r.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = "sm" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${cls} ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

const TRUST_BADGES = [
  { icon: Shield,    text: "Buyer Protection", sub: "100% secure checkout"  },
  { icon: Truck,     text: "Fast Delivery",    sub: "Nationwide shipping"   },
  { icon: RotateCcw, text: "Easy Returns",     sub: "7-day return policy"   },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
      <div className="space-y-4">
        <div className="h-96 lg:h-[500px] bg-gray-200 rounded-3xl" />
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
      <div className="space-y-5 pt-2">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-10 bg-gray-200 rounded w-40" />
        <div className="h-14 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

// ── Related product card ───────────────────────────────────────────────────────
function RelatedCard({ product }) {
  const addItem   = useCartStore((s) => s.addItem);
  const addToWish = useUIStore((s) => s.addToWishlist);
  const wishlist  = useUIStore((s) => s.wishlist);
  const isWished  = wishlist.includes(product.id);

  const displayPrice = product.salePrice ?? product.price;
  const image        = product.images?.[0] ?? null;

  return (
    <Link href={`/product/${product.id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-44 overflow-hidden bg-gray-50">
        {image ? (
          <Image src={image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {product.salePrice && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {Math.round(((product.price - product.salePrice) / product.price) * 100)}% off
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1 truncate">{product.vendor?.name}</p>
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2">{product.name}</p>
        <p className="font-bold text-gray-900">₦{displayPrice.toLocaleString()}</p>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

  const addItem            = useCartStore((s) => s.addItem);
  const addToWishlist      = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);
  const addRecentlyViewed  = useUIStore((s) => s.addRecentlyViewed);
  const wishlist           = useUIStore((s) => s.wishlist);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    staleTime: 120_000,
    retry: false,
  });

  const product = data?.product ?? null;

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product?.category?.id],
    queryFn: () => fetchRelated(product?.category?.id),
    enabled: !!product?.category?.id,
    staleTime: 120_000,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: () => fetchReviews(id),
    enabled: !!id,
    staleTime: 60_000,
  });

  const reviews      = reviewsData?.reviews ?? [];
  const reviewTotal  = reviewsData?.total   ?? 0;

  // Compute rating distribution from fetched reviews
  const ratingDist = useMemo(() => {
    if (!reviews.length) return {};
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
    return counts;
  }, [reviews]);

  const related = (relatedData?.products ?? []).filter((p) => p.id !== id).slice(0, 4);

  // Track recently viewed
  useEffect(() => {
    if (id) addRecentlyViewed(id);
  }, [id, addRecentlyViewed]);

  const isWishlisted = wishlist.includes(id);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem({
      productId: product.id,
      vendorId:  product.vendor?.id ?? null,
      name:      product.name,
      price:     product.salePrice ?? product.price,
      image:     product.images?.[0] ?? null,
      quantity,
    });
    toast.success(`${product.name} added to cart`);
  }, [product, quantity, addItem]);

  const handleWishlist = useCallback(() => {
    if (isWishlisted) {
      removeFromWishlist(id);
      toast.success("Removed from wishlist");
    } else {
      addToWishlist(id);
      toast.success("Added to wishlist");
    }
  }, [id, isWishlisted, addToWishlist, removeFromWishlist]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  const images  = product?.images?.length ? product.images : ["/placeholder-product.jpg"];
  const price   = product?.salePrice ?? product?.price ?? 0;
  const discount = product?.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : null;
  const inStock  = (product?.stock ?? 1) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
          {product?.category && (
            <>
              <span>/</span>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-primary transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          {product && (
            <>
              <span>/</span>
              <span className="text-gray-900 line-clamp-1">{product.name}</span>
            </>
          )}
        </nav>

        {/* Error */}
        {isError && (
          <div className="text-center py-24">
            <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h2 className="font-bold text-gray-900 text-xl mb-2">Product not found</h2>
            <p className="text-gray-500 mb-6">This product may have been removed or is no longer available.</p>
            <Link href="/shop" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && <ProductSkeleton />}

        {/* Product detail */}
        {product && (
          <div className="grid lg:grid-cols-2 gap-12">

            {/* ── Image gallery ──────────────────────────────────────────── */}
            <div>
              <div className="relative h-96 lg:h-[500px] rounded-3xl overflow-hidden bg-white border border-gray-100 mb-4">
                <Image
                  src={images[imgIndex]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                  priority
                />
                {discount && (
                  <div className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                    -{discount}%
                  </div>
                )}
                {product.badge && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {product.badge}
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 flex-wrap">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                        i === imgIndex ? "border-primary" : "border-gray-200 hover:border-gray-300"
                      }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Product info ────────────────────────────────────────────── */}
            <div className="space-y-6">
              {/* Vendor */}
              {product.vendor && (
                <Link
                  href={`/vendor/${product.vendor.slug ?? product.vendor.id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                >
                  <Store className="w-4 h-4" />
                  {product.vendor.name}
                  {product.vendor.verified && (
                    <CheckCircle className="w-4 h-4 text-green-500" aria-label="Verified vendor" />
                  )}
                </Link>
              )}

              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              {(product.avgRating > 0 || product.reviewCount > 0) && (
                <div className="flex items-center gap-3">
                  <Stars rating={product.avgRating} size="lg" />
                  <span className="text-base font-semibold text-gray-900">{product.avgRating?.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({product.reviewCount ?? 0} reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-3xl font-bold text-gray-900">₦{price.toLocaleString()}</span>
                {product.salePrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
                      Save {discount}%
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-gray-600 leading-relaxed text-sm">
                  {product.description}
                </p>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2 text-sm">
                {inStock ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-700 font-medium">In Stock</span>
                    {product.stock < 10 && (
                      <span className="text-amber-600 font-medium">— only {product.stock} left</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 font-medium">Out of Stock</span>
                  </>
                )}
                {product.location && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">Ships from {product.location}</span>
                  </>
                )}
              </div>

              {/* Quantity */}
              {inStock && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Quantity</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border-2 border-gray-200 rounded-full overflow-hidden">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      Total: <span className="font-bold text-gray-900">₦{(price * quantity).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {inStock ? "Add to Cart" : "Out of Stock"}
                </motion.button>
                <button
                  onClick={handleWishlist}
                  className={`p-3.5 rounded-full border-2 transition-colors ${
                    isWishlisted
                      ? "border-red-400 bg-red-50 text-red-500"
                      : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-400"
                  }`}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-3.5 rounded-full border-2 border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  aria-label="Share product"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                {TRUST_BADGES.map(({ icon: Icon, text, sub }) => (
                  <div key={text} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-gray-900">{text}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Reviews ────────────────────────────────────────────────────────── */}
        {product && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Customer Reviews
              <span className="ml-2 text-sm font-normal text-gray-500">({product.reviewCount ?? reviewTotal})</span>
            </h2>

            {/* Summary */}
            {(product.avgRating > 0 || reviews.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex items-center gap-8 flex-wrap">
                <div className="text-center shrink-0">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    {product.avgRating?.toFixed(1) ?? "—"}
                  </div>
                  <Stars rating={product.avgRating ?? 0} size="lg" />
                  <p className="text-xs text-gray-500 mt-1">{product.reviewCount ?? reviewTotal} reviews</p>
                </div>
                {reviews.length > 0 && (
                  <div className="flex-1 space-y-2 min-w-40">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingDist[star] ?? 0;
                      const pct   = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-4">{star}</span>
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Review cards */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {review.author[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.author}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-500">No reviews yet</p>
                <p className="text-xs text-gray-400 mt-1">Be the first to review this product after purchase.</p>
              </div>
            )}
          </section>
        )}

        {/* ── Related products ───────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Related Products</h2>
              <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">
                Browse all
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((p) => <RelatedCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Back */}
        <div className="mt-12 pb-4">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
