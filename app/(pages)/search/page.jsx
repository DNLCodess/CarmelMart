"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Star, ChevronLeft, ChevronRight,
  ShoppingCart, Heart, Check, ChevronDown, ChevronUp, Loader2,
  PackageSearch,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchProducts(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") qs.set(k, v);
  });
  const res = await fetch(`/api/products?${qs}`);
  if (!res.ok) throw new Error("Failed to load results");
  return res.json();
}

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "popular",    label: "Most Popular" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Top Rated" },
];

const RATING_OPTIONS = [4, 3, 2, 1];

// ─── sub-components ─────────────────────────────────────────────────────────

function StarRow({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
        />
      ))}
    </span>
  );
}

function ProductCard({ product, onAddToCart, onToggleWishlist, inWishlist }) {
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const displayPrice = hasDiscount ? product.salePrice : product.price;
  const discount = hasDiscount
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Link href={`/product/${product.id}`}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <PackageSearch size={40} />
            </div>
          )}
        </Link>

        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {product.badge && !hasDiscount && (
          <span className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {product.badge}
          </span>
        )}

        <button
          onClick={() => onToggleWishlist(product.id)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform"
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={15}
            className={inWishlist ? "fill-red-500 text-red-500" : "text-gray-500"}
          />
        </button>
      </div>

      <div className="p-3">
        {product.vendor && (
          <p className="text-xs text-gray-400 truncate mb-0.5">
            {product.vendor.name}
            {product.vendor.verified && (
              <Check size={10} className="inline ml-1 text-primary" />
            )}
          </p>
        )}

        <Link href={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        {product.avgRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <StarRow rating={product.avgRating} />
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-base font-bold text-gray-900">
              ₦{displayPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through ml-1.5">
                ₦{product.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onAddToCart(product)}
          disabled={product.stock === 0}
          className="mt-2 w-full flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-medium py-1.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={13} />
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </motion.div>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-2"
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && children}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // ── read URL state ──────────────────────────────────────────────────────
  const q         = searchParams.get("q") || "";
  const category  = searchParams.get("category") || "";
  const sort      = searchParams.get("sort") || "newest";
  const minPrice  = searchParams.get("min_price") || "";
  const maxPrice  = searchParams.get("max_price") || "";
  const minRating = searchParams.get("min_rating") || "";
  const page      = Number(searchParams.get("page") || 1);

  // ── local draft state for price inputs (only committed on blur/Enter) ──
  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);
  const [inputQ, setInputQ]     = useState(q);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // sync local input when URL changes (e.g. back button)
  useEffect(() => { setDraftMin(minPrice); }, [minPrice]);
  useEffect(() => { setDraftMax(maxPrice); }, [maxPrice]);
  useEffect(() => { setInputQ(q); }, [q]);

  // ── URL mutation helper ─────────────────────────────────────────────────
  const push = useCallback((patches) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patches).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    });
    // always reset to page 1 when filters change (unless patch contains page)
    if (!("page" in patches)) next.set("page", "1");
    router.push(`/search?${next.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // ── queries ─────────────────────────────────────────────────────────────
  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ["search", { q, category, sort, minPrice, maxPrice, minRating, page }],
    queryFn: () => fetchProducts({
      search:     q,
      category,
      sort,
      min_price:  minPrice,
      max_price:  maxPrice,
      min_rating: minRating,
      page,
      per_page:   24,
    }),
    keepPreviousData: true,
  });

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });

  const products   = results?.products ?? [];
  const pagination = results?.pagination ?? { total: 0, page: 1, pages: 1 };
  const categories = catData?.categories ?? [];

  // ── cart / wishlist ─────────────────────────────────────────────────────
  const { addItem }    = useCartStore();
  const { wishlist, addToWishlist, removeFromWishlist } = useUIStore();

  const handleAddToCart = (product) => {
    addItem({
      id:       product.id,
      name:     product.name,
      price:    product.salePrice || product.price,
      image:    product.image,
      vendorId: product.vendor?.id,
    });
    toast.success("Added to cart");
  };

  const handleToggleWishlist = (id) => {
    if (wishlist?.includes(id)) {
      removeFromWishlist(id);
      toast.success("Removed from wishlist");
    } else {
      addToWishlist(id);
      toast.success("Saved to wishlist");
    }
  };

  // ── price filter commit ─────────────────────────────────────────────────
  const commitPrice = () => {
    push({ min_price: draftMin, max_price: draftMax });
  };

  // ── search submit ───────────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    push({ q: inputQ.trim() });
  };

  // active filter count for badge
  const activeFilters = [category, minPrice, maxPrice, minRating].filter(Boolean).length;

  // ── sidebar panel (shared between mobile overlay and desktop) ────────────
  const FilterPanel = (
    <div className="space-y-0">
      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-1">
          <button
            onClick={() => push({ category: "" })}
            className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors ${
              !category ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => push({ category: cat.slug })}
              className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors flex justify-between ${
                category === cat.slug
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs text-gray-400">{cat.productCount}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price Range (₦)">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitPrice()}
            className="w-full border border-gray-200 rounded-lg text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-gray-400 text-sm shrink-0">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitPrice()}
            className="w-full border border-gray-200 rounded-lg text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={commitPrice}
          className="mt-2 w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition-colors font-medium"
        >
          Apply
        </button>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Minimum Rating">
        <div className="space-y-1">
          <button
            onClick={() => push({ min_rating: "" })}
            className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors ${
              !minRating ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Any Rating
          </button>
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => push({ min_rating: r })}
              className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors flex items-center gap-2 ${
                Number(minRating) === r
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <StarRow rating={r} />
              <span>& up</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Clear all */}
      {activeFilters > 0 && (
        <button
          onClick={() => push({ category: "", min_price: "", max_price: "", min_rating: "" })}
          className="w-full text-xs text-red-500 hover:text-red-600 flex items-center justify-center gap-1 py-1"
        >
          <X size={12} /> Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── top bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                placeholder="Search products, brands, categories…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
              />
              {inputQ && (
                <button
                  type="button"
                  onClick={() => { setInputQ(""); push({ q: "" }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors hidden sm:block"
            >
              Search
            </button>

            {/* mobile filter toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden relative px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center gap-1.5"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* ── desktop sidebar ───────────────────────────────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-20">
            <p className="text-sm font-bold text-gray-800 mb-4">Filters</p>
            {FilterPanel}
          </div>
        </aside>

        {/* ── mobile sidebar overlay ────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 overflow-y-auto lg:hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <p className="font-bold text-gray-800">Filters</p>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <div className="p-4">{FilterPanel}</div>
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium"
                  >
                    Show {pagination.total} Results
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── main content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* results header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              {q ? (
                <p className="text-sm text-gray-600">
                  {isFetching ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" /> Searching…
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-900">{pagination.total.toLocaleString()}</span>
                      {" results for "}
                      <span className="font-semibold text-gray-900">"{q}"</span>
                    </>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  {isFetching ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" /> Loading…
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-900">{pagination.total.toLocaleString()}</span> products
                    </>
                  )}
                </p>
              )}

              {/* active filter chips */}
              {(category || minPrice || maxPrice || minRating) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {category && (
                    <Chip label={categories.find((c) => c.slug === category)?.name ?? category} onRemove={() => push({ category: "" })} />
                  )}
                  {(minPrice || maxPrice) && (
                    <Chip
                      label={`₦${minPrice || "0"} – ₦${maxPrice || "∞"}`}
                      onRemove={() => { setDraftMin(""); setDraftMax(""); push({ min_price: "", max_price: "" }); }}
                    />
                  )}
                  {minRating && (
                    <Chip label={`${minRating}★ & up`} onRemove={() => push({ min_rating: "" })} />
                  )}
                </div>
              )}
            </div>

            {/* sort */}
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="sort-select" className="text-xs text-gray-500 hidden sm:block">Sort by</label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => push({ sort: e.target.value })}
                className="border border-gray-200 rounded-xl text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-7 bg-gray-100 rounded-xl mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <PackageSearch size={56} className="mx-auto text-gray-200 mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No products found</p>
              <p className="text-sm text-gray-400 mb-6">
                {q ? `No results for "${q}". Try a different keyword or remove filters.` : "Try adjusting your filters."}
              </p>
              <button
                onClick={() => {
                  setInputQ("");
                  push({ q: "", category: "", min_price: "", max_price: "", min_rating: "" });
                }}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      inWishlist={wishlist?.includes(product.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => push({ page: page - 1 })}
                    disabled={page <= 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {buildPageRange(page, pagination.pages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="text-gray-400 text-sm px-1">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => push({ page: p })}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-primary text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => push({ page: page + 1 })}
                    disabled={page >= pagination.pages}
                    className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:opacity-70">
        <X size={11} />
      </button>
    </span>
  );
}

// ─── pagination range builder ─────────────────────────────────────────────────

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
