"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Shield,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Store,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  ArrowLeft,
  Package,
  RefreshCw,
  TrendingUp,
  Eye,
  MapPin,
  Clock,
  MessageCircle,
  ThumbsUp,
  BadgeCheck,
  ShoppingBag,
  BookOpen,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

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
        <Star
          key={n}
          className={`${cls} ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

const TRUST_BADGES = [
  { icon: Shield, text: "Buyer Protection", sub: "100% secure checkout" },
  { icon: Truck, text: "Fast Delivery", sub: "Nationwide shipping" },
  { icon: RotateCcw, text: "Easy Returns", sub: "7-day return policy" },
];

// Nigerian delivery estimate based on time of day
function getDeliveryEstimate() {
  const hour = new Date().getHours();
  if (hour < 14) return "Tomorrow";
  return "In 2 days";
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
      <div className="space-y-4">
        <div className="h-96 lg:h-[500px] bg-gray-200 rounded-3xl" />
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl" />
          ))}
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
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useUIStore((s) => s.wishlist);
  const isWished = wishlist.some(
    (w) => w === product.id || w?.id === product.id,
  );
  const displayPrice = product.salePrice ?? product.price;
  const image = product.images?.[0] ?? null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-44 overflow-hidden bg-gray-50">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width:768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {product.salePrice && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {Math.round(
              ((product.price - product.salePrice) / product.price) * 100,
            )}
            % off
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1 truncate">
          {product.vendor?.name}
        </p>
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2">
          {product.name}
        </p>
        <p className="font-bold text-gray-900">
          ₦{displayPrice.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

// ── Attribute selector ────────────────────────────────────────────────────────
function AttributeSelector({ label, options, selected, onChange }) {
  if (!options?.length) return null;
  const isColor =
    label.toLowerCase().includes("color") ||
    label.toLowerCase().includes("colour");
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">
        {label}: <span className="font-normal text-gray-500">{selected}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all ${
              selected === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Books & Media metadata card ───────────────────────────────────────────────
function MediaMetaCard({ product }) {
  const rows = [
    { label: "Author / Artist",  value: product.mediaAuthor },
    { label: "Publisher / Label", value: product.mediaPublisher },
    { label: "ISBN",             value: product.mediaIsbn },
    { label: "Edition",          value: product.mediaEdition },
    { label: "Language",         value: product.mediaLanguage },
    { label: "Pages / Runtime",  value: product.mediaPages ? `${product.mediaPages}` : null },
    { label: "Release Date",     value: product.mediaPublishDate
        ? new Date(product.mediaPublishDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
        : null },
  ].filter((r) => r.value);

  if (!rows.length && !product.mediaGenre?.length) return null;

  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-sm font-bold text-blue-800">Book / Media Details</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-gray-500 font-medium">{label}</dt>
            <dd className="text-sm font-semibold text-gray-800 wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
      {product.mediaGenre?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {product.mediaGenre.map((g) => (
            <span key={g} className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{g}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sticky CTA bar ────────────────────────────────────────────────────────────
function StickyCTABar({ product, quantity, onAddToCart, onBuyNow, inStock }) {
  const [show, setShow] = useState(false);
  const price = product?.salePrice ?? product?.price ?? 0;

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!product) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="hidden sm:block flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {product.name}
            </p>
            <p className="text-base font-bold text-gray-900">
              ₦{price.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <button
              onClick={onAddToCart}
              disabled={!inStock}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 border-2 border-primary text-primary font-semibold py-2.5 px-4 rounded-full hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
            <button
              onClick={onBuyNow}
              disabled={!inStock}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Buy Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [activeTab, setActiveTab] = useState("description");
  // Simulated live viewers (would come from realtime in production)
  const [viewers] = useState(() => Math.floor(Math.random() * 18) + 3);

  const addItem = useCartStore((s) => s.addItem);
  const addToWishlist = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);
  const addRecentlyViewed = useUIStore((s) => s.addRecentlyViewed);
  const wishlist = useUIStore((s) => s.wishlist);

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

  const reviews = reviewsData?.reviews ?? [];
  const reviewTotal = reviewsData?.total ?? 0;

  const ratingDist = useMemo(() => {
    if (!reviews.length) return {};
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });
    return counts;
  }, [reviews]);

  const related = (relatedData?.products ?? [])
    .filter((p) => p.id !== id)
    .slice(0, 4);

  // Initialize attribute selectors from product data
  useEffect(() => {
    if (product?.attributes) {
      const init = {};
      Object.entries(product.attributes).forEach(([key, vals]) => {
        if (Array.isArray(vals) && vals.length) init[key] = vals[0];
      });
      setSelectedAttrs(init);
    }
  }, [product]);

  useEffect(() => {
    if (id) addRecentlyViewed(id);
  }, [id, addRecentlyViewed]);

  const isWishlisted =
    wishlist.includes(id) || wishlist.some?.((w) => w === id || w?.id === id);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem({
      productId:      product.id,
      vendorId:       product.vendor?.id ?? null,
      name:           product.name,
      price,
      image:          product.images?.[0] ?? null,
      quantity,
      isDigital:      product.isDigital ?? false,
      deliveryFormat,
    });
    toast.success(`${product.name} added to cart`);
  }, [product, price, quantity, deliveryFormat, addItem]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    addItem({
      productId:      product.id,
      vendorId:       product.vendor?.id ?? null,
      name:           product.name,
      price,
      image:          product.images?.[0] ?? null,
      quantity,
      isDigital:      product.isDigital ?? false,
      deliveryFormat,
    });
    window.location.href = "/checkout";
  }, [product, price, quantity, deliveryFormat, addItem]);

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

  const images = product?.images?.length
    ? product.images
    : ["/placeholder-product.jpg"];

  // Format selection: "digital" | "physical"
  // - digital-only product (is_digital=true, stock=0) → always digital
  // - physical-only product → always physical
  // - dual-format product (is_digital=true, stock>0) → customer picks; default digital
  const hasDigital  = product?.isDigital && !!product?.digitalPrice;
  const hasPhysical = (product?.stock ?? 0) > 0;
  const isDualFormat = hasDigital && hasPhysical;

  const [deliveryFormat, setDeliveryFormat] = useState(
    hasDigital ? "digital" : "physical"
  );

  const physicalPrice = product?.salePrice ?? product?.price ?? 0;
  const price = deliveryFormat === "digital" && hasDigital
    ? (product.digitalPrice ?? physicalPrice)
    : physicalPrice;

  const discount = deliveryFormat === "physical" && product?.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : null;
  const inStock = deliveryFormat === "digital" ? hasDigital : hasPhysical;
  const deliveryEstimate = getDeliveryEstimate();

  // Parse attributes safely
  const attrs =
    product?.attributes && typeof product.attributes === "object"
      ? product.attributes
      : {};

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary transition-colors">
              Shop
            </Link>
            {product?.category && (
              <>
                <span>/</span>
                <Link
                  href={`/shop?category=${product.category.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            {product && (
              <>
                <span>/</span>
                <span className="text-gray-900 line-clamp-1">
                  {product.name}
                </span>
              </>
            )}
          </nav>

          {/* Error */}
          {isError && (
            <div className="text-center py-24">
              <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h2 className="font-bold text-gray-900 text-xl mb-2">
                Product not found
              </h2>
              <p className="text-gray-500 mb-6">
                This product may have been removed or is no longer available.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Shop
              </Link>
            </div>
          )}

          {isLoading && <ProductSkeleton />}

          {product && (
            <div className="grid lg:grid-cols-2 gap-12">
              {/* ── Image gallery ──────────────────────────────────────────── */}
              <div>
                <div className="relative h-96 lg:h-[520px] rounded-3xl overflow-hidden bg-white border border-gray-100 mb-4">
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
                  {product.badge && !discount && (
                    <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {product.badge}
                    </div>
                  )}
                  {/* Live viewers badge */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{viewers} people viewing now</span>
                  </div>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setImgIndex(
                            (i) => (i - 1 + images.length) % images.length,
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setImgIndex((i) => (i + 1) % images.length)
                        }
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
                          i === imgIndex
                            ? "border-primary"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        aria-label={`View image ${i + 1}`}
                      >
                        <Image
                          src={img}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Product info ────────────────────────────────────────────── */}
              <div className="space-y-5">
                {/* Vendor */}
                {product.vendor && (
                  <Link
                    href={`/vendor/${product.vendor.slug ?? product.vendor.id}`}
                    className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                  >
                    <Store className="w-4 h-4" />
                    {product.vendor.name}
                    {product.vendor.verified && (
                      <BadgeCheck
                        className="w-4 h-4 text-blue-500"
                        aria-label="Verified vendor"
                      />
                    )}
                  </Link>
                )}

                {/* Condition badge */}
                {product.condition && product.condition !== "new" && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    product.condition === "used"
                      ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                      : "bg-teal-100 text-teal-700 border border-teal-200"
                  }`}>
                    {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                  </span>
                )}

                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h1>

                {/* Rating + sold count */}
                <div className="flex items-center gap-4 flex-wrap">
                  {(product.avgRating > 0 || product.reviewCount > 0) && (
                    <div className="flex items-center gap-2">
                      <Stars rating={product.avgRating} size="lg" />
                      <span className="text-base font-semibold text-gray-900">
                        {product.avgRating?.toFixed(1)}
                      </span>
                      <a
                        href="#reviews"
                        className="text-sm text-primary hover:underline"
                      >
                        ({product.reviewCount ?? 0} reviews)
                      </a>
                    </div>
                  )}
                  {product.soldCount > 0 && (
                    <span className="text-sm text-gray-500">
                      {product.soldCount.toLocaleString()} sold
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <span className="text-3xl font-bold text-gray-900">
                      ₦{price.toLocaleString()}
                    </span>
                    {product.salePrice && (
                      <>
                        <span className="text-xl text-gray-400 line-through">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
                          Save {discount}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Format picker — shown only when both digital and physical are available */}
                {isDualFormat && (
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                    {[
                      { id: "digital",  label: "Digital Download", icon: Download },
                      { id: "physical", label: "Physical Copy",    icon: Truck    },
                    ].map(({ id: fid, label, icon: Icon }) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => setDeliveryFormat(fid)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          deliveryFormat === fid
                            ? "bg-white shadow text-primary"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Digital badge (digital-only products only) */}
                {product.isDigital && !isDualFormat && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold">
                    <Download className="w-3.5 h-3.5" />
                    Digital Download — instant access after payment
                  </div>
                )}

                {/* Format badge */}
                {product.mediaFormat && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    {product.mediaFormat}
                  </span>
                )}

                {/* Stock + delivery */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {inStock ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-700 font-medium">
                          {deliveryFormat === "digital" ? "Available" : "In Stock"}
                        </span>
                        {deliveryFormat === "physical" && product.stock > 0 && product.stock <= 10 && (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                            Only {product.stock} left!
                          </span>
                        )}
                        {product.soldToday > 0 && (
                          <span className="text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {product.soldToday} sold in last 24h
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 font-medium">Out of Stock</span>
                      </>
                    )}
                  </div>
                  {(product.isDigital && deliveryFormat === "digital") ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Download className="w-4 h-4 text-primary shrink-0" />
                      <span>Download link sent to your email and order page immediately after payment</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Truck className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        Estimated delivery:{" "}
                        <span className="font-semibold text-gray-900">{deliveryEstimate}</span>
                        {product.location && ` · Ships from ${product.location}`}
                      </span>
                    </div>
                  )}
                  {(!product.isDigital || deliveryFormat === "physical") && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <RotateCcw className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        7-day easy returns —{" "}
                        <span className="font-semibold text-gray-900">no questions asked</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Books & Media metadata */}
                {product.category?.template === "books_media" && (
                  <MediaMetaCard product={product} />
                )}

                {/* Attributes (size, color, etc.) */}
                {Object.keys(attrs).length > 0 && (
                  <div className="space-y-4 pt-1">
                    {Object.entries(attrs).map(
                      ([key, vals]) =>
                        Array.isArray(vals) &&
                        vals.length > 0 && (
                          <AttributeSelector
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            options={vals}
                            selected={selectedAttrs[key] ?? vals[0]}
                            onChange={(v) =>
                              setSelectedAttrs((s) => ({ ...s, [key]: v }))
                            }
                          />
                        ),
                    )}
                  </div>
                )}

                {/* Quantity */}
                {inStock && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Quantity
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border-2 border-gray-200 rounded-full overflow-hidden">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-semibold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity((q) =>
                              Math.min(product.stock || 99, q + 1),
                            )
                          }
                          className="px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        Total:{" "}
                        <span className="font-bold text-gray-900">
                          ₦{(price * quantity).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* CTA buttons */}
                <div className="space-y-3">
                  {/* Primary actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleBuyNow}
                      disabled={!inStock}
                      className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-sm sm:text-base"
                    >
                      <ShoppingBag className="w-5 h-5 shrink-0" />
                      Buy Now
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAddToCart}
                      disabled={!inStock}
                      className="flex items-center justify-center gap-2 border-2 border-primary text-primary font-bold py-4 rounded-2xl hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                    >
                      <ShoppingCart className="w-5 h-5 shrink-0" />
                      Add to Cart
                    </motion.button>
                  </div>
                  {/* Secondary actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleWishlist}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition-colors ${
                        isWishlisted
                          ? "border-red-300 bg-red-50 text-red-500"
                          : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50"
                      }`}
                      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart className={`w-4 h-4 shrink-0 ${isWishlisted ? "fill-current" : ""}`} />
                      {isWishlisted ? "Saved" : "Save"}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors text-sm font-semibold"
                      aria-label="Share product"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  {TRUST_BADGES.map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">
                        {text}
                      </p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Seller info card */}
                {product.vendor && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {product.vendor.name}
                          </p>
                          {product.vendor.verified && (
                            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" /> Verified Seller
                            </p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/vendor/${product.vendor.slug ?? product.vendor.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Visit Store →
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Usually ships in 24–48 hrs
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Responds within 2
                        hrs
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tabs (Description / Specs / Reviews) ──────────────────────────── */}
          {product && (
            <div className="mt-16" id="reviews">
              <div className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto">
                {[
                  { id: "description", label: "Description" },
                  { id: "specs", label: "Specifications" },
                  {
                    id: "reviews",
                    label: `Reviews (${product.reviewCount ?? reviewTotal})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Description tab */}
              {activeTab === "description" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  {product.description ? (
                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      No description provided.
                    </p>
                  )}
                </div>
              )}

              {/* Specs tab */}
              {activeTab === "specs" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  {Object.keys(attrs).length > 0 ? (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(attrs).map(([key, val]) => (
                          <tr key={key}>
                            <td className="py-3 pr-4 text-gray-500 font-medium capitalize w-40">
                              {key}
                            </td>
                            <td className="py-3 text-gray-900">
                              {Array.isArray(val)
                                ? val.join(", ")
                                : String(val)}
                            </td>
                          </tr>
                        ))}
                        {product.category && (
                          <tr>
                            <td className="py-3 pr-4 text-gray-500 font-medium w-40">
                              Category
                            </td>
                            <td className="py-3 text-gray-900">
                              {product.category.name}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      No specifications available.
                    </p>
                  )}
                </div>
              )}

              {/* Reviews tab */}
              {activeTab === "reviews" && (
                <div>
                  {(product.avgRating > 0 || reviews.length > 0) && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex items-center gap-8 flex-wrap">
                      <div className="text-center shrink-0">
                        <div className="text-5xl font-bold text-gray-900 mb-2">
                          {product.avgRating?.toFixed(1) ?? "—"}
                        </div>
                        <Stars rating={product.avgRating ?? 0} size="lg" />
                        <p className="text-xs text-gray-500 mt-1">
                          {product.reviewCount ?? reviewTotal} reviews
                        </p>
                      </div>
                      {reviews.length > 0 && (
                        <div className="flex-1 space-y-2 min-w-40">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = ratingDist[star] ?? 0;
                            const pct =
                              reviews.length > 0
                                ? Math.round((count / reviews.length) * 100)
                                : 0;
                            return (
                              <div
                                key={star}
                                className="flex items-center gap-3"
                              >
                                <span className="text-xs text-gray-500 w-4">
                                  {star}
                                </span>
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-8">
                                  {pct}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="bg-white rounded-2xl border border-gray-100 p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                                {review.author[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {review.author}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(review.date).toLocaleDateString(
                                    "en-NG",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                            <Stars rating={review.rating} />
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                          {review.helpful > 0 && (
                            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {review.helpful}{" "}
                              found this helpful
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                      <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-500">
                        No reviews yet
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Be the first to review this product after purchase.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Related products ───────────────────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  You May Also Like
                </h2>
                <Link
                  href="/shop"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Browse all
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((p) => (
                  <RelatedCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Back */}
          <div className="mt-12 pb-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky CTA bar */}
      <StickyCTABar
        product={product}
        quantity={quantity}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        inStock={inStock}
      />
    </>
  );
}
