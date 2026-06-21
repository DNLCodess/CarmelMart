"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  Star, ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw,
  ChevronLeft, ChevronRight, Store, CheckCircle, XCircle, Minus, Plus,
  ArrowLeft, Package, RefreshCw, TrendingUp, Clock, MessageCircle,
  ThumbsUp, BadgeCheck, ShoppingBag, BookOpen, Download, Tag, Check,
  AlertCircle, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { getTemplate } from "@/lib/product-templates";

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

// ── Colour swatch map ─────────────────────────────────────────────────────────
const COLOR_HEX = {
  black:"#111",white:"#fff",red:"#ef4444",blue:"#3b82f6",green:"#16a34a",
  yellow:"#eab308",orange:"#f97316",pink:"#ec4899",purple:"#a855f7",
  brown:"#92400e",gray:"#6b7280",grey:"#6b7280",navy:"#1e3a5f",
  cream:"#fef3c7",beige:"#d4b896",gold:"#d97706",silver:"#9ca3af",
  maroon:"#7f1d1d",teal:"#0d9488",indigo:"#4338ca",violet:"#7c3aed",
  coral:"#f87171",mint:"#6ee7b7",lavender:"#c4b5fd","sky blue":"#38bdf8",
  "light blue":"#93c5fd","dark blue":"#1d4ed8",olive:"#65a30d",
  khaki:"#a3a33a",charcoal:"#374151",wine:"#7f1d1d",peach:"#fca5a1",
  "rose gold":"#c17d6c",
};
function getColorHex(name) {
  return COLOR_HEX[name?.toLowerCase()?.trim()] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = "sm" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star key={n} className={`${cls} ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 dark:text-gray-700"}`} />
      ))}
    </div>
  );
}
function getDeliveryEstimate() {
  return new Date().getHours() < 14 ? "Tomorrow" : "In 2 days";
}

// Checks if at least one variant has stock for a given dimension value,
// keeping all OTHER currently-selected dimensions fixed.
function isDimValueAvailable(variants, dimKey, dimValue, currentCombination) {
  return variants.some((v) =>
    v.combination[dimKey] === dimValue &&
    v.stock > 0 &&
    Object.entries(currentCombination)
      .filter(([k]) => k !== dimKey)
      .every(([k, val]) => v.combination[k] === val)
  );
}

// Finds which tier applies for a given quantity
function activeTier(tiers, qty) {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  return sorted.find((t) => qty >= t.min_qty) ?? null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 animate-pulse">
      <div className="space-y-3">
        <div className="h-80 sm:h-[440px] lg:h-[540px] bg-gray-200 dark:bg-gray-700 rounded-3xl" />
        <div className="flex gap-2.5">
          {[0,1,2,3].map((i) => <div key={i} className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
      <div className="space-y-5 pt-2">
        {[32,60,24,44,56,44,100].map((w, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Variant dimension picker ──────────────────────────────────────────────────
function VariantDimensionPicker({ dim, selected, variants, currentCombination, onChange }) {
  const isColorDim = dim.key === "color" || dim.key === "colour";
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{dim.label}</span>
        {selected && <span className="text-sm text-gray-500 dark:text-gray-400">— {selected}</span>}
      </div>

      {isColorDim ? (
        // Colour swatches
        <div className="flex flex-wrap gap-2.5">
          {dim.values.map((opt) => {
            const hex       = getColorHex(opt);
            const available = isDimValueAvailable(variants, dim.key, opt, currentCombination);
            const isActive  = selected === opt;
            const isLight   = hex && ["#fff","#fef3c7","#fca5a1","#6ee7b7","#c4b5fd","#93c5fd","#d4b896"].includes(hex);
            return (
              <button
                key={opt}
                onClick={() => available && onChange(opt)}
                title={opt}
                disabled={!available}
                className={`relative w-9 h-9 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive   ? "border-primary ring-2 ring-primary/30 scale-110" :
                  !available ? "border-gray-200 dark:border-gray-700 opacity-35 cursor-not-allowed" :
                               "border-gray-300 dark:border-gray-600 hover:scale-110 hover:border-gray-400"
                }`}
                style={hex ? { backgroundColor: hex, borderColor: isActive ? undefined : (isLight ? "#d1d5db" : undefined) } : {}}
                aria-label={opt}
                aria-pressed={isActive}
              >
                {!hex && <span className="text-[10px] font-semibold leading-tight px-0.5 text-gray-700 dark:text-gray-300">{opt.slice(0,3)}</span>}
                {isActive && (
                  <Check className={`w-3.5 h-3.5 absolute inset-0 m-auto ${isLight ? "text-gray-800" : "text-white"}`} strokeWidth={3} />
                )}
                {!available && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block w-px h-full bg-gray-400/60 rotate-45 absolute" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Text pill buttons (size, storage, etc.)
        <div className="flex flex-wrap gap-2">
          {dim.values.map((opt) => {
            const available = isDimValueAvailable(variants, dim.key, opt, currentCombination);
            const isActive  = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => available && onChange(opt)}
                disabled={!available}
                className={`relative px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                  isActive   ? "border-primary bg-primary/10 text-primary" :
                  !available ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed line-through" :
                               "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                }`}
                aria-pressed={isActive}
              >
                {opt}
                {!available && (
                  <span className="absolute inset-x-0 top-1/2 h-px bg-gray-300 dark:bg-gray-600" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Descriptive attribute chips (informational only — no stock effect) ─────────
function DescriptiveAttributeChips({ label, values }) {
  if (!values?.length) return null;
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 pt-1 capitalize">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Books & Media metadata card ───────────────────────────────────────────────
function MediaMetaCard({ product }) {
  const rows = [
    { label: "Author / Artist",   value: product.mediaAuthor },
    { label: "Publisher / Label", value: product.mediaPublisher },
    { label: "ISBN",              value: product.mediaIsbn },
    { label: "Edition",           value: product.mediaEdition },
    { label: "Language",          value: product.mediaLanguage },
    { label: "Pages / Runtime",   value: product.mediaPages ? `${product.mediaPages}` : null },
    { label: "Release Date",      value: product.mediaPublishDate
        ? new Date(product.mediaPublishDate).toLocaleDateString("en-NG", { year:"numeric", month:"long", day:"numeric" })
        : null },
  ].filter((r) => r.value);

  if (!rows.length && !product.mediaGenre?.length) return null;

  return (
    <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Book / Media Details</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {rows.map(({ label, value }) => (
          <div key={label} className={label === "ISBN" ? "col-span-2" : "col-span-2 sm:col-span-1"}>
            <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</dt>
            <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
      {product.mediaGenre?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-blue-200 dark:border-blue-800">
          {product.mediaGenre.map((g) => (
            <span key={g} className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">{g}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Related product card ───────────────────────────────────────────────────────
function RelatedCard({ product }) {
  const displayPrice = product.salePrice ?? product.price;
  const image = product.images?.[0] ?? null;
  return (
    <Link href={`/product/${product.id}`} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-44 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {image
          ? <Image src={image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 50vw, 25vw" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-300 dark:text-gray-600" /></div>
        }
        {product.salePrice && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {Math.round(((product.price - product.salePrice) / product.price) * 100)}% off
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{product.vendor?.name}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-2">{product.name}</p>
        <p className="font-bold text-gray-900 dark:text-gray-100">₦{displayPrice.toLocaleString()}</p>
      </div>
    </Link>
  );
}

// ── Sticky CTA bar ────────────────────────────────────────────────────────────
function StickyCTABar({ product, quantity, selectedVariant, onAddToCart, onBuyNow, inStock, price }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 520);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (!product) return null;

  const variantLabel = selectedVariant
    ? Object.values(selectedVariant.combination).join(" · ")
    : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="hidden sm:block flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">₦{price.toLocaleString()}</p>
              {variantLabel && <span className="text-xs text-gray-400 dark:text-gray-500">{variantLabel}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <button onClick={onAddToCart} disabled={!inStock}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 border-2 border-primary text-primary font-semibold py-2.5 px-4 rounded-full hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
            <button onClick={onBuyNow} disabled={!inStock}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 px-5 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-sm">
              <ShoppingBag className="w-4 h-4" /> Buy Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProductDetailContent({ product }) {
  const id = product.id;
  const router  = useRouter();
  const thumbRef = useRef(null);

  const [quantity,           setQuantity]           = useState(1);
  const [imgIndex,           setImgIndex]           = useState(0);
  const [selectedAttrs,      setSelectedAttrs]      = useState({});
  const [selectedCombination, setSelectedCombination] = useState({});
  const [activeTab,          setActiveTab]          = useState("description");

  const addItem            = useCartStore((s) => s.addItem);
  const addToWishlist      = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);
  const addRecentlyViewed  = useUIStore((s) => s.addRecentlyViewed);
  const wishlist           = useUIStore((s) => s.wishlist);

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product.category?.id],
    queryFn:  () => fetchRelated(product.category?.id),
    enabled:  !!product.category?.id,
    staleTime: 120_000,
  });
  const { data: reviewsData } = useQuery({
    queryKey: ["product-reviews", product.id],
    queryFn:  () => fetchReviews(product.id),
    enabled:  !!product.id,
    staleTime: 60_000,
  });

  const reviews     = reviewsData?.reviews ?? [];
  const reviewTotal = reviewsData?.total ?? 0;
  const ratingDist  = useMemo(() => {
    const counts = { 5:0, 4:0, 3:0, 2:0, 1:0 };
    reviews.forEach((r) => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
    return counts;
  }, [reviews]);

  const related = (relatedData?.products ?? []).filter((p) => p.id !== id).slice(0, 4);

  // Template for extra field labels in specs tab
  const template = useMemo(() => getTemplate(product?.category?.template ?? "standard"), [product?.category?.template]);

  // Initialise descriptive attribute selectors
  useEffect(() => {
    if (product?.attributes) {
      const init = {};
      Object.entries(product.attributes).forEach(([key, vals]) => {
        if (Array.isArray(vals) && vals.length) init[key] = vals[0];
      });
      setSelectedAttrs(init);
    }
  }, [product]);

  // Initialise variant combination from first available variant
  useEffect(() => {
    if (product?.variantType === "variants" && product.variants?.length > 0) {
      const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
      setSelectedCombination(firstAvailable.combination);
    }
  }, [product?.id]);

  // Reset qty to 1 when selected variant changes (avoid qty > new variant stock)
  const prevVariantId = useRef(null);

  // Derived variant data
  const variantDimensions = useMemo(() => {
    if (product?.variantType !== "variants" || !product.variants?.length) return [];
    const keys = Object.keys(product.variants[0].combination);
    return keys.map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      values: [...new Set(product.variants.map((v) => v.combination[key]).filter(Boolean))],
    }));
  }, [product?.variants, product?.variantType]);

  const selectedVariant = useMemo(() => {
    if (product?.variantType !== "variants" || !product.variants?.length) return null;
    return product.variants.find((v) =>
      Object.entries(selectedCombination).every(([k, val]) => v.combination[k] === val)
    ) ?? null;
  }, [product?.variants, product?.variantType, selectedCombination]);

  // Reset qty when variant changes and new max < current qty
  useEffect(() => {
    if (selectedVariant && selectedVariant.id !== prevVariantId.current) {
      prevVariantId.current = selectedVariant.id;
      if (selectedVariant.stock > 0 && quantity > selectedVariant.stock) {
        setQuantity(Math.min(quantity, selectedVariant.stock));
      }
    }
  }, [selectedVariant, quantity]);

  useEffect(() => { if (id) addRecentlyViewed(id); }, [id, addRecentlyViewed]);

  const isWishlisted = wishlist.includes(id) || wishlist.some?.((w) => w === id || w?.id === id);

  // Digital/physical format
  const hasDigital  = product?.isDigital && !!product?.digitalPrice;
  const hasPhysical = (product?.stock ?? 0) > 0;
  const isDualFormat = hasDigital && hasPhysical;
  const [deliveryFormat, setDeliveryFormat] = useState("physical");
  useEffect(() => {
    if (!product) return;
    setDeliveryFormat(hasDigital ? "digital" : "physical");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Effective stock and price
  const effectiveStock = product?.variantType === "variants"
    ? (selectedVariant?.stock ?? 0)
    : (product?.stock ?? 0);

  const physicalPrice    = product?.salePrice ?? product?.price ?? 0;
  const variantBasePrice = selectedVariant?.price ?? physicalPrice;
  const basePrice        = deliveryFormat === "digital" && hasDigital
    ? (product.digitalPrice ?? physicalPrice)
    : variantBasePrice;

  // Apply quantity tier pricing
  const currentTier   = activeTier(product?.quantityTiers, quantity);
  const price         = currentTier ? currentTier.price : basePrice;
  const tierSaving    = currentTier ? (basePrice - currentTier.price) : 0;

  const discount = product?.salePrice && !selectedVariant?.price && deliveryFormat !== "digital"
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : null;

  const inStock          = deliveryFormat === "digital" ? hasDigital : effectiveStock > 0;
  const deliveryEstimate = getDeliveryEstimate();

  // Attributes — exclude variant dimension keys from specs display
  const variantDimKeys = new Set(variantDimensions.map((d) => d.key));
  const attrs = product?.attributes && typeof product.attributes === "object"
    ? Object.fromEntries(Object.entries(product.attributes).filter(([k]) => !variantDimKeys.has(k)))
    : {};

  // Map attribute keys to human-readable labels from template
  function attrLabel(key) {
    const field = template.extraFields.find((f) => f.key === key);
    return field ? field.label : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
  }

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (product.variantType === "variants" && !selectedVariant) {
      toast.error("Please select an option before adding to cart");
      return;
    }
    addItem({
      productId:          product.id,
      vendorId:           product.vendor?.id ?? null,
      name:               product.name,
      price,
      image:              product.images?.[0] ?? null,
      quantity,
      isDigital:          product.isDigital ?? false,
      deliveryFormat,
      variantId:          selectedVariant?.id ?? null,
      variantCombination: selectedVariant?.combination ?? null,
    });
    toast.success(`${product.name} added to cart`);
  }, [product, price, quantity, deliveryFormat, selectedVariant, addItem]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    if (product.variantType === "variants" && !selectedVariant) {
      toast.error("Please select an option before buying");
      return;
    }
    addItem({
      productId:          product.id,
      vendorId:           product.vendor?.id ?? null,
      name:               product.name,
      price,
      image:              product.images?.[0] ?? null,
      quantity,
      isDigital:          product.isDigital ?? false,
      deliveryFormat,
      variantId:          selectedVariant?.id ?? null,
      variantCombination: selectedVariant?.combination ?? null,
    });
    router.push("/checkout");
  }, [product, price, quantity, deliveryFormat, selectedVariant, addItem, router]);

  const handleWishlist = useCallback(() => {
    if (isWishlisted) { removeFromWishlist(id); toast.success("Removed from wishlist"); }
    else              { addToWishlist(id);       toast.success("Added to wishlist");    }
  }, [id, isWishlisted, addToWishlist, removeFromWishlist]);

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: product?.name, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
  };

  // Scroll thumbnail into view on index change
  useEffect(() => {
    const el = thumbRef.current?.children[imgIndex];
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [imgIndex]);

  const images = product?.images?.length ? product.images : ["/placeholder-product.jpg"];

  const TRUST_BADGES = [
    { icon: Shield,   text: "Buyer Protection", sub: "100% secure checkout" },
    { icon: Truck,    text: "Fast Delivery",     sub: "Nationwide shipping"  },
    { icon: RotateCcw,text: "Easy Returns",      sub: "7-day return policy"  },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-8 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            {product?.category && (
              <><span>/</span>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-primary transition-colors">{product.category.name}</Link></>
            )}
            {product && (
              <><span>/</span><span className="text-gray-900 dark:text-gray-200 line-clamp-1">{product.name}</span></>
            )}
          </nav>

          <div className="grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] gap-6 lg:gap-12 items-start">

              {/* ── Image gallery ─────────────────────────────────────────────── */}
              <div className="lg:sticky lg:top-6 space-y-3">
                {/* Main image */}
                <div className="relative h-80 sm:h-[440px] lg:h-[540px] rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 select-none">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={imgIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0"
                    >
                      <Image src={images[imgIndex]} alt={product.name} fill className="object-cover"
                        sizes="(max-width:1024px) 100vw, 55vw" priority />
                    </motion.div>
                  </AnimatePresence>

                  {/* Discount / badge pill */}
                  {discount && (
                    <div className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                      -{discount}%
                    </div>
                  )}
                  {product.badge && !discount && (
                    <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {product.badge}
                    </div>
                  )}

                  {/* Arrow navigation */}
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        aria-label="Previous image">
                        <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>
                      <button onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        aria-label="Next image">
                        <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>

                      {/* Dot indicators for mobile */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 lg:hidden">
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setImgIndex(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? "bg-white w-4" : "bg-white/50"}`}
                            aria-label={`Image ${i + 1}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail strip — horizontal scroll */}
                {images.length > 1 && (
                  <div ref={thumbRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setImgIndex(i)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 snap-start rounded-xl overflow-hidden border-2 transition-all ${
                          i === imgIndex
                            ? "border-primary shadow-md"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                        aria-label={`View image ${i + 1}`}>
                        <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Product info panel ──────────────────────────────────────────── */}
              <div className="space-y-6">

                {/* Vendor + condition */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {product.vendor && (
                    <Link href={`/vendor/${product.vendor.slug ?? product.vendor.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
                      <Store className="w-4 h-4" />
                      {product.vendor.name}
                      {product.vendor.verified && <BadgeCheck className="w-4 h-4 text-blue-500" aria-label="Verified vendor" />}
                    </Link>
                  )}
                  {product.condition && product.condition !== "new" && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      product.condition === "used"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
                        : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
                    }`}>
                      {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {product.name}
                </h1>

                {/* Rating row */}
                {(product.avgRating > 0 || product.reviewCount > 0 || product.soldCount > 0) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {(product.avgRating > 0 || product.reviewCount > 0) && (
                      <div className="flex items-center gap-1.5">
                        <Stars rating={product.avgRating} size="lg" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{product.avgRating?.toFixed(1)}</span>
                        <a href="#reviews" className="text-sm text-primary hover:underline">({product.reviewCount ?? 0})</a>
                      </div>
                    )}
                    {product.soldCount > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">{product.soldCount.toLocaleString()} sold</span>
                    )}
                    {product.soldToday > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" /> {product.soldToday} sold today
                      </span>
                    )}
                  </div>
                )}

                {/* ── Price block ────────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={price}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100"
                      >
                        ₦{price.toLocaleString()}
                      </motion.span>
                    </AnimatePresence>
                    {product.salePrice && !selectedVariant?.price && (
                      <>
                        <span className="text-xl text-gray-400 dark:text-gray-500 line-through">₦{product.price.toLocaleString()}</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-0.5 rounded-full">Save {discount}%</span>
                      </>
                    )}
                    {selectedVariant?.price && selectedVariant.price !== physicalPrice && (
                      <span className="text-xs text-primary font-semibold bg-primary/10 px-2.5 py-0.5 rounded-full">
                        Price for selected option
                      </span>
                    )}
                  </div>

                  {/* Active tier saving callout */}
                  {currentTier && (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      Bulk price applied — saving ₦{tierSaving.toLocaleString()} per unit!
                    </div>
                  )}

                  {/* Quantity tier table (collapsed by default) */}
                  {product.quantityTiers?.length > 0 && !currentTier && (
                    <div className="pt-1 flex flex-col gap-1">
                      {product.quantityTiers.map((tier, idx) => (
                        <p key={idx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-green-500 shrink-0" />
                          Buy <span className="font-bold text-gray-700 dark:text-gray-300">{tier.min_qty}+</span>
                          → ₦{Number(tier.price).toLocaleString()} each
                          <span className="text-green-600 dark:text-green-500 font-medium">
                            ({Math.round(((basePrice - tier.price) / basePrice) * 100)}% off)
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Format picker (digital + physical) */}
                {isDualFormat && (
                  <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
                    {[{ id:"digital", label:"Digital Download", icon: Download }, { id:"physical", label:"Physical Copy", icon: Truck }]
                      .map(({ id: fid, label, icon: Icon }) => (
                      <button key={fid} type="button" onClick={() => setDeliveryFormat(fid)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          deliveryFormat === fid ? "bg-white dark:bg-gray-700 shadow text-primary" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}>
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Digital-only badge */}
                {product.isDigital && !isDualFormat && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                    <Download className="w-3.5 h-3.5" />
                    Digital Download — instant access after payment
                  </div>
                )}

                {/* Media format badge */}
                {product.mediaFormat && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    {product.mediaFormat}
                  </span>
                )}

                {/* Books & Media details */}
                {product.category?.template === "books_media" && (
                  <MediaMetaCard product={product} />
                )}

                {/* ── Variant picker ────────────────────────────────────────────── */}
                {product.variantType === "variants" && variantDimensions.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-5">
                    {variantDimensions.map((dim) => (
                      <VariantDimensionPicker
                        key={dim.key}
                        dim={dim}
                        selected={selectedCombination[dim.key] ?? dim.values[0]}
                        variants={product.variants}
                        currentCombination={selectedCombination}
                        onChange={(val) => setSelectedCombination((prev) => ({ ...prev, [dim.key]: val }))}
                      />
                    ))}
                    {/* Unavailable combination warning */}
                    {!selectedVariant && Object.keys(selectedCombination).length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        This combination isn't available. Try a different selection.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Descriptive attributes (informational) ────────────────────── */}
                {product.variantType !== "variants" && (
                  (() => {
                    const descriptiveDims = Object.entries(product.attributes ?? {})
                      .filter(([, v]) => Array.isArray(v) && v.length > 0);
                    if (!descriptiveDims.length) return null;
                    return (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Available Options</p>
                        {descriptiveDims.map(([key, vals]) => (
                          <DescriptiveAttributeChips
                            key={key}
                            label={attrLabel(key)}
                            values={vals}
                          />
                        ))}
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          Contact the vendor for specific availability.
                        </p>
                      </div>
                    );
                  })()
                )}

                {/* ── Stock + delivery info ──────────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {inStock ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-green-700 dark:text-green-400 font-semibold">
                          {deliveryFormat === "digital" ? "Available to download" : "In Stock"}
                        </span>
                        {deliveryFormat === "physical" && effectiveStock > 0 && effectiveStock <= 10 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full text-xs">
                            Only {effectiveStock} left{product.variantType === "variants" ? " in this option" : ""}!
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {product.variantType === "variants" && !selectedVariant
                            ? "Select an option above"
                            : "Out of Stock"}
                        </span>
                      </>
                    )}
                  </div>
                  {deliveryFormat === "digital" && product.isDigital ? (
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Download className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Download link sent to your email and order page immediately after payment</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Truck className="w-4 h-4 text-primary shrink-0" />
                      <span>Estimated delivery: <span className="font-semibold text-gray-900 dark:text-gray-100">{deliveryEstimate}</span>
                        {product.location && ` · Ships from ${product.location}`}
                      </span>
                    </div>
                  )}
                  {(!product.isDigital || deliveryFormat === "physical") && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <RotateCcw className="w-4 h-4 text-primary shrink-0" />
                      <span>7-day easy returns — <span className="font-semibold text-gray-900 dark:text-gray-100">no questions asked</span></span>
                    </div>
                  )}
                </div>

                {/* ── Quantity picker ────────────────────────────────────────────── */}
                {inStock && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Quantity</span>
                      {effectiveStock > 0 && effectiveStock <= 20 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{effectiveStock} available</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border-2 border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden">
                        <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Decrease quantity">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-gray-900 dark:text-gray-100">{quantity}</span>
                        <button onClick={() => setQuantity((q) => Math.min(effectiveStock || 99, q + 1))}
                          className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Increase quantity">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                        <p className="font-extrabold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                          ₦{(price * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CTAs ──────────────────────────────────────────────────────── */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleBuyNow} disabled={!inStock}
                      className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-sm sm:text-base">
                      <ShoppingBag className="w-5 h-5 shrink-0" /> Buy Now
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddToCart} disabled={!inStock}
                      className="flex items-center justify-center gap-2 border-2 border-primary text-primary font-bold py-4 rounded-2xl hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm sm:text-base">
                      <ShoppingCart className="w-5 h-5 shrink-0" /> Add to Cart
                    </motion.button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleWishlist}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition-colors ${
                        isWishlisted ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-500 dark:text-red-400"
                                     : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      }`}
                      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                      <Heart className={`w-4 h-4 shrink-0 ${isWishlisted ? "fill-current" : ""}`} />
                      {isWishlisted ? "Saved" : "Save"}
                    </button>
                    <button onClick={handleShare}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:text-primary transition-colors text-sm font-semibold"
                      aria-label="Share product">
                      <Share2 className="w-4 h-4 shrink-0" /> Share
                    </button>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {TRUST_BADGES.map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="text-center">
                      <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-1.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight">{text}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Seller card */}
                {product.vendor && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{product.vendor.name}</p>
                          {product.vendor.verified && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" /> Verified Seller
                            </p>
                          )}
                        </div>
                      </div>
                      <Link href={`/vendor/${product.vendor.slug ?? product.vendor.id}`}
                        className="text-xs font-semibold text-primary hover:underline shrink-0">
                        Visit Store →
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ships in 24–48 hrs</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Responds in 2 hrs</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* ── Tabs ──────────────────────────────────────────────────────────── */}
          <div className="mt-10 sm:mt-16" id="reviews">
              <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide">
                {[
                  { id: "description", label: "Description" },
                  { id: "specs",       label: "Specifications" },
                  { id: "reviews",     label: `Reviews (${product.reviewCount ?? reviewTotal})` },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Description */}
              {activeTab === "description" && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                  {product.description
                    ? <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line">{product.description}</p>
                    : <p className="text-gray-400 dark:text-gray-500 text-sm">No description provided.</p>
                  }
                </div>
              )}

              {/* Specifications — uses template labels, excludes variant dimensions */}
              {activeTab === "specs" && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                  {(() => {
                    // Non-array attributes (single scalar values like brand, model, unit_type)
                    const scalarAttrs = Object.entries(attrs).filter(([, v]) => !Array.isArray(v) && v !== null && v !== "");
                    // Array attributes (multicheck values like RAM options)
                    const listAttrs   = Object.entries(attrs).filter(([, v]) => Array.isArray(v) && v.length > 0);
                    const hasSpecs    = scalarAttrs.length > 0 || listAttrs.length > 0 || product.condition || product.category;
                    if (!hasSpecs) return <p className="text-gray-400 dark:text-gray-500 text-sm">No specifications available.</p>;
                    return (
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {scalarAttrs.map(([key, val]) => (
                            <tr key={key}>
                              <td className="py-3 pr-6 text-gray-500 dark:text-gray-400 font-medium w-40 shrink-0 align-top">{attrLabel(key)}</td>
                              <td className="py-3 text-gray-900 dark:text-gray-100 font-medium">{String(val)}</td>
                            </tr>
                          ))}
                          {listAttrs.map(([key, vals]) => (
                            <tr key={key}>
                              <td className="py-3 pr-6 text-gray-500 dark:text-gray-400 font-medium w-40 shrink-0 align-top">{attrLabel(key)}</td>
                              <td className="py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {vals.map((v) => (
                                    <span key={v} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{v}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {product.condition && (
                            <tr>
                              <td className="py-3 pr-6 text-gray-500 dark:text-gray-400 font-medium w-40">Condition</td>
                              <td className="py-3 text-gray-900 dark:text-gray-100 font-medium capitalize">{product.condition}</td>
                            </tr>
                          )}
                          {product.category && (
                            <tr>
                              <td className="py-3 pr-6 text-gray-500 dark:text-gray-400 font-medium w-40">Category</td>
                              <td className="py-3 text-gray-900 dark:text-gray-100 font-medium">{product.category.name}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* Reviews */}
              {activeTab === "reviews" && (
                <div>
                  {(product.avgRating > 0 || reviews.length > 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 mb-5 flex items-center gap-6 sm:gap-10 flex-wrap">
                      <div className="text-center shrink-0">
                        <div className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">{product.avgRating?.toFixed(1) ?? "—"}</div>
                        <Stars rating={product.avgRating ?? 0} size="lg" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.reviewCount ?? reviewTotal} reviews</p>
                      </div>
                      {reviews.length > 0 && (
                        <div className="flex-1 space-y-2 min-w-36">
                          {[5,4,3,2,1].map((star) => {
                            const pct = reviews.length ? Math.round(((ratingDist[star] ?? 0) / reviews.length) * 100) : 0;
                            return (
                              <div key={star} className="flex items-center gap-2.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-3">{star}</span>
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right">{pct}%</span>
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
                        <div key={review.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                                {review.author[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{review.author}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(review.date).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" })}</p>
                              </div>
                            </div>
                            <Stars rating={review.rating} />
                          </div>
                          {review.comment && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.comment}</p>}
                          {review.helpful > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {review.helpful} found this helpful
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
                      <Star className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No reviews yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to review this product after purchase.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Related products */}
          {related.length > 0 && (
            <section className="mt-10 sm:mt-16">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">You May Also Like</h2>
                <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">Browse all</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((p) => <RelatedCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          <div className="mt-12 pb-4">
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </div>
      </div>

      <StickyCTABar
        product={product}
        quantity={quantity}
        selectedVariant={selectedVariant}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        inStock={inStock}
        price={price}
      />
    </>
  );
}

// ── Page wrapper — fetches data, hands off to ProductDetailContent ─────────────
export default function ProductDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn:  () => fetchProduct(id),
    enabled:  !!id,
    staleTime: 120_000,
    retry: false,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><ProductSkeleton /></div>
    </div>
  );

  if (isError || !data?.product) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Package className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl mb-2">Product not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This product may have been removed or is no longer available.</p>
        <Link href="/shop" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    </div>
  );

  return <ProductDetailContent product={data.product} />;
}
