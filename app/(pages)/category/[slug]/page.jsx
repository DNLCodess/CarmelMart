"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, Grid3X3, List, Star, ShoppingCart,
  Heart, ChevronDown, ArrowLeft, Search, X, Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Highest Rated" },
  { value: "popular",    label: "Most Popular" },
];

const PER_PAGE = 12;

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

async function fetchCategory(slug) {
  const res = await fetch("/api/categories");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return (json.categories ?? []).find((c) => c.slug === slug) ?? null;
}

async function fetchCategoryProducts({ slug, sort, page, search, minPrice, maxPrice, minRating }) {
  const params = new URLSearchParams({ category: slug, sort, page, per_page: PER_PAGE });
  if (search)          params.set("search", search);
  if (minPrice > 0)    params.set("min_price", minPrice);
  if (maxPrice < 500000) params.set("max_price", maxPrice);
  if (minRating > 0)   params.set("min_rating", minRating);
  const res = await fetch(`/api/products?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

export default function CategoryPage() {
  const { slug } = useParams();

  const [sort, setSort]           = useState("newest");
  const [view, setView]           = useState("grid");
  const [search, setSearch]       = useState("");
  const [minRating, setMinRating] = useState(0);
  const [minPrice, setMinPrice]   = useState(0);
  const [maxPrice, setMaxPrice]   = useState(500000);
  const [page, setPage]           = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const addItem            = useCartStore((s) => s.addItem);
  const wishlist           = useUIStore((s) => s.wishlist);
  const addToWishlist      = useUIStore((s) => s.addToWishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);

  const { data: category } = useQuery({
    queryKey: ["category-meta", slug],
    queryFn:  () => fetchCategory(slug),
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["category-products", slug, sort, page, search, minPrice, maxPrice, minRating],
    queryFn:  () => fetchCategoryProducts({ slug, sort, page, search, minPrice, maxPrice, minRating }),
    keepPreviousData: true,
  });

  const products   = data?.products ?? [];
  const pagination = data?.pagination ?? { total: 0, pages: 1 };

  const hasActiveFilters = search || minRating > 0 || maxPrice < 500000 || minPrice > 0;

  const resetFilters = () => {
    setSearch(""); setMinRating(0); setMinPrice(0); setMaxPrice(500000); setSort("newest"); setPage(1);
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    const price = product.salePrice ?? product.price;
    addItem({ productId: product.id, vendorId: product.vendor?.id ?? null, name: product.name, price, image: product.image, quantity: 1 });
    toast.success(`${product.name} added to cart`);
  };

  const toggleWishlist = (e, product) => {
    e.preventDefault();
    const inWishlist = wishlist.some((w) => (w?.id ?? w) === product.id);
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.success("Removed from wishlist");
    } else {
      addToWishlist(product);
      toast.success("Added to wishlist");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Category hero banner */}
      <div className="relative h-44 sm:h-56 overflow-hidden bg-gray-800">
        {category?.image && (
          <Image src={category.image} alt={category.name ?? slug} fill className="object-cover opacity-70" priority />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-gray-800/90 to-gray-600/60" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-8 pb-6 max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-1.5 text-white/70 text-xs mb-3 hover:text-white transition-colors w-fit">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow capitalize">
            {category?.name ?? slug.replace(/-/g, " ")}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {category?.description ?? `${pagination.total} products from verified vendors`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:block w-56 shrink-0 space-y-6">
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search products…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm font-bold text-gray-900">Max Price</p>
                <span className="text-xs text-primary font-semibold">₦{maxPrice.toLocaleString()}</span>
              </div>
              <input
                type="range" min={0} max={500000} step={1000}
                value={maxPrice}
                onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₦0</span><span>₦500K</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Minimum Rating</p>
              <div className="space-y-1.5">
                {[0, 3, 4, 4.5].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === r}
                      onChange={() => { setMinRating(r); setPage(1); }}
                      className="accent-primary"
                    />
                    {r === 0
                      ? <span className="text-sm text-gray-600 group-hover:text-gray-900">All ratings</span>
                      : <span className="flex items-center gap-1 text-sm text-gray-600 group-hover:text-gray-900">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {r}+
                        </span>
                    }
                  </label>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium">
                <X className="w-4 h-4" /> Clear filters
              </button>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-full text-gray-700 hover:border-primary transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filters
                {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
              </button>

              <p className="text-sm text-gray-500 mr-auto">
                <span className="font-semibold text-gray-900">{pagination.total}</span> products
              </p>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`p-2.5 transition-colors ${view === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-2.5 transition-colors ${view === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile filters panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden overflow-hidden mb-5"
                >
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 grid sm:grid-cols-3 gap-5">
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Search</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text" value={search}
                          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                          placeholder="Search…"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Max Price</p>
                        <span className="text-xs text-primary font-semibold">₦{maxPrice.toLocaleString()}</span>
                      </div>
                      <input
                        type="range" min={0} max={500000} step={1000}
                        value={maxPrice}
                        onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Min Rating</p>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 3, 4, 4.5].map((r) => (
                          <button
                            key={r}
                            onClick={() => { setMinRating(r); setPage(1); }}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${minRating === r ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-600 hover:border-primary"}`}
                          >
                            {r === 0 ? "All" : `${r}+★`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="text-center py-24">
                <p className="text-gray-500">Failed to load products. Please try again.</p>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && products.length === 0 && (
              <div className="text-center py-24">
                <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">No products found</h3>
                <p className="text-sm text-gray-500 mb-5">Try adjusting your filters</p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Products grid */}
            {!isLoading && !isError && products.length > 0 && view === "grid" && (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {products.map((product) => {
                    const inWishlist = wishlist.some((w) => (w?.id ?? w) === product.id);
                    const displayPrice = product.salePrice ?? product.price;
                    return (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -4 }}
                        className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
                      >
                        <Link href={`/product/${product.id}`}>
                          <div className="relative h-52 overflow-hidden bg-gray-100">
                            {product.image
                              ? <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              : <div className="w-full h-full bg-gray-100" />
                            }
                            {product.badge && (
                              <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                {product.badge}
                              </span>
                            )}
                            <button
                              onClick={(e) => toggleWishlist(e, product)}
                              className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${inWishlist ? "bg-red-500 text-white" : "bg-white text-gray-500 hover:text-red-500"}`}
                            >
                              <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                            </button>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => handleAddToCart(e, product)}
                                className="flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors"
                              >
                                <ShoppingCart className="w-4 h-4" /> Add to Cart
                              </button>
                            </div>
                          </div>
                        </Link>
                        <div className="p-4">
                          <Link href={`/product/${product.id}`}>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
                          </Link>
                          <p className="text-xs text-gray-500 mb-2">{product.vendor?.name}</p>
                          <div className="flex items-center gap-1 mb-3">
                            <Stars rating={product.avgRating} />
                            <span className="text-xs text-gray-500">({product.reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900">₦{displayPrice.toLocaleString()}</span>
                            {product.salePrice && (
                              <span className="text-xs text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Products list */}
            {!isLoading && !isError && products.length > 0 && view === "list" && (
              <div className="space-y-4">
                {products.map((product) => {
                  const inWishlist = wishlist.some((w) => (w?.id ?? w) === product.id);
                  const displayPrice = product.salePrice ?? product.price;
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
                      <Link href={`/product/${product.id}`} className="shrink-0">
                        <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-gray-100">
                          {product.image && (
                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                          )}
                          {product.badge && (
                            <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {product.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${product.id}`}>
                          <h3 className="font-semibold text-gray-900 text-sm mb-0.5 line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
                        </Link>
                        <p className="text-xs text-gray-500 mb-1.5">{product.vendor?.name}</p>
                        <div className="flex items-center gap-1 mb-3">
                          <Stars rating={product.avgRating} />
                          <span className="text-xs text-gray-500">({product.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-base font-bold text-gray-900">₦{displayPrice.toLocaleString()}</span>
                          {product.salePrice && (
                            <span className="text-xs text-gray-400 line-through">₦{product.price.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={(e) => toggleWishlist(e, product)}
                          className={`p-2 rounded-full border transition-colors ${inWishlist ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:text-red-500"}`}
                        >
                          <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${page === n ? "bg-primary text-white" : "border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
