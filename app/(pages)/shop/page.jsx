"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Star, ShoppingCart, Heart,
  ChevronDown, Grid3X3, List, ChevronLeft, ChevronRight,
  CheckCircle, Flame, Tag, Zap, LayoutGrid, Filter,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/authStore";
import { useUIStore } from "@/store/userStore";

// ── Fetchers ─────────────────────────────────────────────────────────────────
async function fetchProducts(params) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== "" && v !== undefined))
  ).toString();
  const res = await fetch(`/api/products?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function fetchFeaturedVendors() {
  const res = await fetch("/api/vendors/featured");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { label: "Newest",          value: "newest"     },
  { label: "Most Popular",    value: "popular"    },
  { label: "Price: Low–High", value: "price_asc"  },
  { label: "Price: High–Low", value: "price_desc" },
  { label: "Top Rated",       value: "rating"     },
];

const PRICE_PRESETS = [
  { label: "All Prices",         min: null,    max: null    },
  { label: "Under ₦10,000",      min: null,    max: 10000   },
  { label: "₦10k – ₦50k",       min: 10000,   max: 50000   },
  { label: "₦50k – ₦150k",      min: 50000,   max: 150000  },
  { label: "₦150k – ₦500k",     min: 150000,  max: 500000  },
  { label: "Above ₦500,000",     min: 500000,  max: null    },
];

const RATING_OPTIONS = [
  { label: "Any Rating",   value: 0   },
  { label: "4.5 & above", value: 4.5 },
  { label: "4.0 & above", value: 4.0 },
  { label: "3.0 & above", value: 3.0 },
];

const PER_PAGE = 12;

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, view, onAddToCart, onToggleWishlist, inWishlist }) {
  const discount = product.salePrice
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : null;

  if (view === "list") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow p-4 flex gap-4">
        <Link href={`/product/${product.id}`} className="shrink-0">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gray-50">
            {product.image && <Image src={product.image} alt={product.name} fill className="object-cover" />}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          {product.category && (
            <p className="text-xs text-primary font-semibold mb-1">{product.category.name}</p>
          )}
          <Link href={`/product/${product.id}`}>
            <h3 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-2 hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.vendor && (
            <div className="flex items-center gap-1 mb-2">
              <p className="text-xs text-gray-500">{product.vendor.name}</p>
              {product.vendor.verified && <CheckCircle className="w-3 h-3 text-blue-500" />}
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-3">
            <Stars rating={product.avgRating} />
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-bold text-gray-900">
              ₦{(product.salePrice ?? product.price).toLocaleString()}
            </span>
            {product.salePrice && (
              <span className="text-sm text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
            )}
            {discount && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{discount}% OFF</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={() => onToggleWishlist(product)} className={`p-2 rounded-full border transition-colors ${inWishlist ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:text-red-500"}`}>
            <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
    >
      <Link href={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {product.image && (
            <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          )}
          {/* Badges */}
          {product.badge && (
            <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
              product.badge.includes("OFF") || product.badge === "Sale"
                ? "bg-green-500 text-white"
                : product.badge === "Hot" || product.badge === "Trending"
                ? "bg-red-500 text-white"
                : product.badge === "New"
                ? "bg-blue-500 text-white"
                : "bg-primary text-white"
            }`}>
              {product.badge}
            </span>
          )}
          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-500">Out of Stock</span>
            </div>
          )}
          {/* Wishlist button */}
          <button
            onClick={(e) => { e.preventDefault(); onToggleWishlist(product); }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors ${inWishlist ? "bg-red-500 text-white" : "bg-white text-gray-400 hover:text-red-500"}`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
          </button>
          {/* Add to cart hover overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
              disabled={product.stock === 0}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-bold py-2.5 rounded-full hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
            </button>
          </div>
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        {product.category && (
          <p className="text-xs font-semibold text-primary mb-1">{product.category.name}</p>
        )}
        <Link href={`/product/${product.id}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.vendor && (
          <div className="flex items-center gap-1 mb-2">
            <p className="text-xs text-gray-500 truncate">{product.vendor.name}</p>
            {product.vendor.verified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-3">
          <Stars rating={product.avgRating} />
          <span className="text-xs text-gray-500">({product.reviewCount})</span>
        </div>
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-gray-900">
              ₦{(product.salePrice ?? product.price).toLocaleString()}
            </span>
            {product.salePrice && (
              <span className="text-xs text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
            )}
          </div>
          {discount && <p className="text-xs text-green-600 font-semibold mt-0.5">Save {discount}%</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Filter Sidebar ────────────────────────────────────────────────────────────
function FilterSidebar({ filters, setFilter, categories, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-0
        w-72 lg:w-56 xl:w-64 bg-white lg:bg-transparent
        border-r lg:border-0 border-gray-100
        overflow-y-auto lg:overflow-visible
        flex-shrink-0
        transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-5 lg:p-0 space-y-6">
          {/* Close button (mobile) */}
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="font-bold text-gray-900">Filters</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setFilter("category", null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!filters.category ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                All Products
              </button>
              {(categories || []).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter("category", cat.slug)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${filters.category === cat.slug ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-xs ${filters.category === cat.slug ? "text-white/70" : "text-gray-400"}`}>
                    {cat.productCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Price Range</h3>
            <div className="space-y-1">
              {PRICE_PRESETS.map((preset) => {
                const active = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    onClick={() => { setFilter("minPrice", preset.min); setFilter("maxPrice", preset.max); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Customer Rating</h3>
            <div className="space-y-1">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter("minRating", opt.value || null)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${filters.minRating === opt.value || (!filters.minRating && opt.value === 0) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  {opt.value > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                      <span>{opt.label}</span>
                    </>
                  ) : opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Featured Vendors Strip ─────────────────────────────────────────────────────
function VendorsStrip({ vendors }) {
  if (!vendors?.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-bold text-gray-900">Verified Vendors</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {vendors.map((v) => (
          <Link
            key={v.id}
            href={`/vendor/${v.slug}`}
            className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-primary hover:shadow-sm transition-all text-sm font-semibold text-gray-800"
          >
            {v.image ? (
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100">
                <Image src={v.image} alt={v.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">{v.name[0]}</span>
              </div>
            )}
            <span>{v.name}</span>
            {v.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function ShopContent() {
  const router      = useRouter();
  const pathname    = usePathname();
  const sp          = useSearchParams();
  const addItem     = useCartStore((s) => s.addItem);
  const wishlist    = useUIStore((s) => s.wishlist);
  const addToWishlist    = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);

  // URL-synced filters
  const [filters, setFiltersState] = useState({
    category:  sp.get("category")   || null,
    search:    sp.get("q")          || "",
    minPrice:  sp.get("min_price") ? Number(sp.get("min_price")) : null,
    maxPrice:  sp.get("max_price") ? Number(sp.get("max_price")) : null,
    minRating: sp.get("min_rating") ? Number(sp.get("min_rating")) : null,
    sort:      sp.get("sort")       || "newest",
    page:      sp.get("page") ? Number(sp.get("page")) : 1,
  });
  const [view, setView]            = useState("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setFilter = useCallback((key, value) => {
    setFiltersState((prev) => {
      const next = { ...prev, [key]: value };
      if (key !== "page") next.page = 1; // reset page on filter change
      return next;
    });
  }, []);

  // Sync filters → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category)  params.set("category",   filters.category);
    if (filters.search)    params.set("q",           filters.search);
    if (filters.minPrice)  params.set("min_price",   filters.minPrice);
    if (filters.maxPrice)  params.set("max_price",   filters.maxPrice);
    if (filters.minRating) params.set("min_rating",  filters.minRating);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page > 1)  params.set("page",        filters.page);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, pathname, router]);

  // Queries
  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts({
      category:   filters.category,
      search:     filters.search,
      min_price:  filters.minPrice,
      max_price:  filters.maxPrice,
      min_rating: filters.minRating,
      sort:       filters.sort,
      page:       filters.page,
      per_page:   PER_PAGE,
    }),
    staleTime: 30_000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors-featured"],
    queryFn: fetchFeaturedVendors,
    staleTime: 60_000,
  });

  const products   = productsData?.products ?? [];
  const pagination = productsData?.pagination ?? { total: 0, pages: 1, page: 1 };
  const categories = categoriesData?.categories ?? [];
  const vendors    = vendorsData?.vendors ?? [];

  // Active filter chips
  const activeFilters = [
    filters.category  && { key: "category",  label: categories.find((c) => c.slug === filters.category)?.name ?? filters.category },
    filters.search    && { key: "search",    label: `"${filters.search}"` },
    (filters.minPrice !== null || filters.maxPrice !== null) && {
      key: "price",
      label: filters.minPrice && filters.maxPrice
        ? `₦${filters.minPrice.toLocaleString()} – ₦${filters.maxPrice.toLocaleString()}`
        : filters.minPrice ? `Above ₦${filters.minPrice.toLocaleString()}`
        : `Under ₦${filters.maxPrice?.toLocaleString()}`,
    },
    filters.minRating && { key: "minRating", label: `${filters.minRating}+ stars` },
  ].filter(Boolean);

  const clearFilter = (key) => {
    if (key === "price") { setFilter("minPrice", null); setFilter("maxPrice", null); }
    else setFilter(key, key === "minRating" ? null : null);
  };

  const handleAddToCart = (product) => {
    addItem({ productId: product.id, vendorId: product.vendor?.id ?? null, name: product.name, price: product.salePrice ?? product.price, image: product.image, quantity: 1 });
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleWishlist = (product) => {
    const inWishlist = wishlist.some((w) => w.id === product.id);
    if (inWishlist) { removeFromWishlist(product.id); toast.success("Removed from wishlist"); }
    else { addToWishlist(product); toast.success("Added to wishlist"); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Shop header banner ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {filters.category
                  ? categories.find((c) => c.slug === filters.category)?.name ?? "Shop"
                  : "Shop All Products"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading ? "Loading…" : `${pagination.total.toLocaleString()} products found`}
              </p>
            </div>
            {/* Search bar */}
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder="Search products…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {filters.search && (
                <button onClick={() => setFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <FilterSidebar
            filters={filters}
            setFilter={setFilter}
            categories={categories}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Vendors strip */}
            <VendorsStrip vendors={vendors} />

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-700 hover:border-primary bg-white"
              >
                <Filter className="w-4 h-4" /> Filters
                {activeFilters.length > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {activeFilters.length}
                  </span>
                )}
              </button>

              {/* Active filter chips */}
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-full"
                >
                  {f.label}
                  <button onClick={() => clearFilter(f.key)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {activeFilters.length > 1 && (
                <button
                  onClick={() => setFiltersState({ category: null, search: "", minPrice: null, maxPrice: null, minRating: null, sort: "newest", page: 1 })}
                  className="text-xs font-semibold text-gray-500 hover:text-red-500 underline"
                >
                  Clear all
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {/* Sort */}
                <div className="relative hidden sm:block">
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilter("sort", e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white font-medium text-gray-700 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* View toggle */}
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setView("grid")} className={`p-2.5 transition-colors ${view === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setView("list")} className={`p-2.5 transition-colors ${view === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className={view === "grid" ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse ${view === "grid" ? "" : "flex gap-4 p-4"}`}>
                    <div className={view === "grid" ? "aspect-square bg-gray-200" : "w-32 h-32 bg-gray-200 rounded-xl shrink-0"} />
                    <div className={`p-4 space-y-2 ${view === "list" ? "flex-1" : ""}`}>
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3 mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">Failed to load products.</p>
                <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90">Retry</button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && products.length === 0 && (
              <div className="text-center py-20">
                <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">No products found</h3>
                <p className="text-sm text-gray-500 mb-5">Try adjusting your filters or search term.</p>
                <button
                  onClick={() => setFiltersState({ category: null, search: "", minPrice: null, maxPrice: null, minRating: null, sort: "newest", page: 1 })}
                  className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Products */}
            {!isLoading && !isError && products.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${filters.category}-${filters.sort}-${filters.page}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={view === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-3"
                  }
                >
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      view={view}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      inWishlist={wishlist.some((w) => w.id === product.id)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination */}
            {!isLoading && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setFilter("page", Math.max(1, filters.page - 1))}
                  disabled={filters.page <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(7, pagination.pages) }, (_, i) => {
                  const p = pagination.pages <= 7 ? i + 1 : i + Math.max(1, Math.min(filters.page - 3, pagination.pages - 6));
                  if (p < 1 || p > pagination.pages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setFilter("page", p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${filters.page === p ? "bg-primary text-white shadow-sm" : "border border-gray-200 text-gray-700 hover:border-primary hover:text-primary bg-white"}`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setFilter("page", Math.min(pagination.pages, filters.page + 1))}
                  disabled={filters.page >= pagination.pages}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
