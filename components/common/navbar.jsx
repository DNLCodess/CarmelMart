"use client";
// @portal: buyer
// @surface: global navigation

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, User, Heart, Menu, X, LogOut,
  Zap, Laptop, Shirt, Home as HomeIcon, Gem, Dumbbell,
  BookOpen, Package, Settings, TrendingUp, Bell,
  BadgeCheck, ArrowRight, Phone, MapPin, ChevronDown, ChevronRight,
  LayoutGrid, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { logoutAction } from "@/app/actions/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Bold the portion of text that matches the search query
function HighlightMatch({ text, query }) {
  if (!query || query.length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-black text-gray-900 not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const PROMO_MESSAGES = [
  { text: "Shop from verified Nigerian vendors — nationwide delivery", icon: "🚚" },
  { text: "Flash Sale is LIVE — Up to 70% off today only", icon: "⚡" },
  { text: "Sell on CarmelMart — Join thousands of verified vendors", icon: "🏪" },
];

const SEARCH_SUGGESTIONS = [
  { label: "Nike Sneakers",        category: "Fashion"     },
  { label: "iPhone 15 Pro",        category: "Electronics" },
  { label: "Standing Desk",        category: "Home"        },
  { label: "Face Serum",           category: "Beauty"      },
  { label: "Gaming Chair",         category: "Home"        },
  { label: "Wireless Earbuds",     category: "Electronics" },
  { label: "African Print Dress",  category: "Fashion"     },
  { label: "Protein Supplement",   category: "Sports"      },
  { label: "Laptop Backpack",      category: "Electronics" },
  { label: "Skincare Bundle",      category: "Beauty"      },
];

const SEARCH_CATEGORIES = [
  "All Categories", "Fashion", "Electronics", "Phones",
  "Home & Living", "Beauty", "Sports", "Books",
];

const CATEGORIES = [
  { name: "All Departments", href: "/shop",                         icon: LayoutGrid  },
  { name: "Fashion",         href: "/shop?category=fashion",        icon: Shirt       },
  { name: "Electronics",     href: "/shop?category=electronics",    icon: Laptop      },
  { name: "Phones",          href: "/shop?category=phones",         icon: Phone       },
  { name: "Home",            href: "/shop?category=home-living",    icon: HomeIcon    },
  { name: "Beauty",          href: "/shop?category=beauty",         icon: Gem         },
  { name: "Sports",          href: "/shop?category=sports",         icon: Dumbbell    },
  { name: "Books",           href: "/shop?category=books",          icon: BookOpen    },
  { name: "Flash Sale",      href: "/shop?sort=flash_sale",         icon: Zap, hot: true },
];

// Sub-categories shown in mega-menu on hover
const CATEGORY_SUBS = {
  Fashion:     { subs: ["Men's Wear", "Women's Wear", "Shoes & Sneakers", "Bags & Accessories", "Watches", "Traditional Wear"], href: "/shop?category=fashion"     },
  Electronics: { subs: ["Laptops & Computers", "Televisions", "Audio & Headphones", "Cameras", "Gaming", "Smart Home"],         href: "/shop?category=electronics" },
  Phones:      { subs: ["Smartphones", "Feature Phones", "Phone Cases", "Chargers & Cables", "Screen Protectors", "Power Banks"], href: "/shop?category=phones"      },
  Home:        { subs: ["Furniture", "Kitchen & Dining", "Bedding & Pillows", "Home Decor", "Lighting", "Storage"],              href: "/shop?category=home-living"  },
  Beauty:      { subs: ["Skincare", "Makeup", "Hair Care", "Fragrances", "Nail Care", "Personal Care"],                         href: "/shop?category=beauty"      },
  Sports:      { subs: ["Gym Equipment", "Sportswear", "Supplements", "Outdoor & Camping", "Cycling", "Swimming"],              href: "/shop?category=sports"       },
  Books:       { subs: ["Fiction", "Non-Fiction", "Academic & Textbooks", "Children's Books", "Business", "Self Help"],         href: "/shop?category=books"        },
};

const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Kano", "Oyo", "Delta",
  "Anambra", "Kaduna", "Enugu", "Ondo", "Osun", "Ogun", "Edo", "Kwara", "Plateau",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Navbar() {
  // UI state
  const [isScrolled,          setIsScrolled]          = useState(false);
  const [promoIndex,          setPromoIndex]          = useState(0);
  const [promoVisible,        setPromoVisible]        = useState(true);
  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [searchQuery,         setSearchQuery]         = useState("");
  const [debouncedQuery,      setDebouncedQuery]      = useState("");
  const [searchCategory,      setSearchCategory]      = useState("All Categories");
  const [showSuggestions,     setShowSuggestions]     = useState(false);
  const [activeIndex,         setActiveIndex]         = useState(-1);
  const [showCartPreview,     setShowCartPreview]     = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [activeCategory,      setActiveCategory]      = useState("All Departments");
  const [showLocationPicker,  setShowLocationPicker]  = useState(false);
  const [hoveredCategory,     setHoveredCategory]     = useState(null);

  // Refs
  const cartHoverTimer    = useRef(null);
  const accountHoverTimer = useRef(null);
  const megaMenuTimer     = useRef(null);

  // Store & auth
  const router      = useRouter();
  const pathname    = usePathname();
  const queryClient = useQueryClient();

  const { user, role, isAuthenticated, isLoading, isVendor, isCustomer, isAdmin } = useAuth();

  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal  = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wishlistCount       = useUIStore((s) => s.wishlist.length);
  const deliveryLocation    = useUIStore((s) => s.deliveryLocation);
  const setDeliveryLocation = useUIStore((s) => s.setDeliveryLocation);
  const recentSearches      = useUIStore((s) => s.recentSearches);
  const addRecentSearch     = useUIStore((s) => s.addRecentSearch);
  const clearRecentSearches = useUIStore((s) => s.clearRecentSearches);

  const firstName    = user?.first_name ?? user?.email?.split("@")[0] ?? "Guest";
  const displayName  = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email?.split("@")[0] ?? "Account";
  const displayRole  = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Customer";
  const initials     = displayName.slice(0, 2).toUpperCase();

  // Debounce search query for live API calls
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: liveData, isFetching: liveLoading } = useQuery({
    queryKey: ["search-autocomplete", debouncedQuery, searchCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ search: debouncedQuery, per_page: "7" });
      if (searchCategory !== "All Categories") params.set("category", searchCategory.toLowerCase().replace(/\s+/g, "-"));
      const r = await fetch(`/api/products?${params}`);
      return r.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });

  const liveResults = liveData?.products ?? [];

  // Flat navigable list for keyboard arrow-key navigation
  const navItems = (() => {
    if (debouncedQuery.length >= 2) return liveResults.map((p) => ({ type: "product", data: p }));
    if (recentSearches.length > 0)  return recentSearches.map((s) => ({ type: "recent",   data: s }));
    return SEARCH_SUGGESTIONS.slice(0, 5).map((s) => ({ type: "trending", data: s }));
  })();

  // Reset keyboard selection whenever the query changes
  useEffect(() => { setActiveIndex(-1); }, [searchQuery]);

  const filteredSuggestions = searchQuery.length >= 2
    ? SEARCH_SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : SEARCH_SUGGESTIONS.slice(0, 5);

  const accountLinks = isAuthenticated ? [
    ...(isCustomer ? [{ label: "My Account",       href: "/my-account",        icon: User       }] : []),
    ...(isVendor   ? [{ label: "Vendor Dashboard", href: "/vendor/dashboard",  icon: TrendingUp }] : []),
    ...(isAdmin    ? [{ label: "Admin Panel",       href: "/admin/dashboard",   icon: Settings   }] : []),
    ...(isAdmin    ? [] : [{ label: "My Orders",     href: "/orders",   icon: Package }]),
    { label: "Settings", href: "/settings", icon: Settings },
  ] : [];

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) addRecentSearch(q);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setIsMobileMenuOpen(false);
    const catParam = searchCategory !== "All Categories"
      ? `&category=${encodeURIComponent(searchCategory.toLowerCase())}`
      : "";
    router.push(q ? `/shop?q=${encodeURIComponent(q)}${catParam}` : "/shop");
  }, [router, searchQuery, searchCategory, addRecentSearch]);

  const handleSuggestionClick = useCallback((label) => {
    addRecentSearch(label);
    setSearchQuery(label);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setIsMobileMenuOpen(false);
    router.push(`/shop?q=${encodeURIComponent(label)}`);
  }, [router, addRecentSearch]);

  const handleSearchKeyDown = useCallback((e) => {
    if (!showSuggestions || navItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = navItems[activeIndex];
      if (item.type === "product") {
        addRecentSearch(item.data.name);
        setShowSuggestions(false);
        setActiveIndex(-1);
        router.push(`/product/${item.data.id}`);
      } else {
        handleSuggestionClick(item.type === "recent" ? item.data : item.data.label);
      }
    }
  }, [showSuggestions, navItems, activeIndex, router, addRecentSearch, handleSuggestionClick]);

  const handleSignOut = useCallback(async () => {
    await logoutAction();
    queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    setIsMobileMenuOpen(false);
    setShowAccountDropdown(false);
  }, [queryClient]);

  // ── Hover helpers ─────────────────────────────────────────────────────────────

  const handleCartEnter    = () => { clearTimeout(cartHoverTimer.current);    setShowCartPreview(true);       };
  const handleCartLeave    = () => { cartHoverTimer.current    = setTimeout(() => setShowCartPreview(false),    180); };
  const handleAccountEnter = () => { clearTimeout(accountHoverTimer.current); setShowAccountDropdown(true);   };
  const handleAccountLeave = () => { accountHoverTimer.current = setTimeout(() => setShowAccountDropdown(false), 180); };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!promoVisible) return;
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, [promoVisible]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    const onKey = (e) => { if (e.key === "Escape") setIsMobileMenuOpen(false); };
    if (isMobileMenuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen]);

  useEffect(() => () => {
    clearTimeout(cartHoverTimer.current);
    clearTimeout(accountHoverTimer.current);
    clearTimeout(megaMenuTimer.current);
  }, []);

  // ── Shared suggestions dropdown ──────────────────────────────────────────────

  const suggestionsDropdown = showSuggestions && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
    >

      {/* ── Live product results (query ≥ 2 chars) ── */}
      {debouncedQuery.length >= 2 && (
        <>
          <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {liveLoading ? "Searching…" : liveResults.length > 0 ? `${liveResults.length} products` : "No products found"}
            </p>
            {searchCategory !== "All Categories" && (
              <span className="text-[11px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">in {searchCategory}</span>
            )}
          </div>

          {liveLoading && (
            <div className="px-4 py-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-16 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {!liveLoading && liveResults.length > 0 && (
            <div className="max-h-72 overflow-y-auto">
              {liveResults.map((product, idx) => {
                const image       = Array.isArray(product.images) ? product.images[0] : product.image;
                const price       = product.salePrice ?? product.price;
                const isActive    = idx === activeIndex;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={() => {
                      addRecentSearch(product.name);
                      setShowSuggestions(false);
                      setActiveIndex(-1);
                      router.push(`/product/${product.id}`);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? "bg-primary/5" : "hover:bg-gray-50"}`}
                  >
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      {image && <Image src={image} alt={product.name} fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium truncate">
                        <HighlightMatch text={product.name} query={debouncedQuery} />
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{product.vendor?.name ?? product.category?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">₦{price.toLocaleString()}</p>
                      {product.salePrice && (
                        <p className="text-[10px] text-gray-400 line-through">₦{product.price.toLocaleString()}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!liveLoading && liveResults.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-400 mb-2">No products match &ldquo;{debouncedQuery}&rdquo;</p>
              <button
                type="submit"
                onMouseDown={() => { addRecentSearch(debouncedQuery); setShowSuggestions(false); router.push(`/shop?q=${encodeURIComponent(debouncedQuery)}`); }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Search all categories →
              </button>
            </div>
          )}

          {/* Related keyword chips */}
          {!liveLoading && filteredSuggestions.length > 0 && (
            <div className="border-t border-gray-50 px-4 py-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Related</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.map((s) => (
                  <button key={s.label} type="button" onMouseDown={() => handleSuggestionClick(s.label)}
                    className="text-[11px] text-gray-600 bg-gray-100 hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-full transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View all footer */}
          {!liveLoading && liveResults.length > 0 && (
            <div className="border-t border-gray-50">
              <button type="submit" onMouseDown={() => { addRecentSearch(debouncedQuery); setShowSuggestions(false); }}
                className="w-full px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors text-center">
                See all results for &ldquo;{debouncedQuery}&rdquo; →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Empty state: recent searches + trending ── */}
      {debouncedQuery.length < 2 && (
        <>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <>
              <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recent</p>
                <button type="button" onMouseDown={clearRecentSearches}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium">
                  Clear
                </button>
              </div>
              {recentSearches.map((term, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button key={term} type="button"
                    onMouseDown={() => handleSuggestionClick(term)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? "bg-primary/5" : "hover:bg-gray-50"}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{term}</span>
                    <X className="w-3 h-3 text-gray-300 hover:text-gray-500 shrink-0"
                      onMouseDown={(e) => { e.stopPropagation(); clearRecentSearches(); }} />
                  </button>
                );
              })}
            </>
          )}

          {/* Trending searches */}
          <div className={`px-4 py-2.5 ${recentSearches.length > 0 ? "border-t border-gray-50" : "border-b border-gray-50"}`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Trending</p>
          </div>
          {SEARCH_SUGGESTIONS.slice(0, 5).map((s, idx) => {
            const navIdx   = recentSearches.length + idx;
            const isActive = navIdx === activeIndex;
            return (
              <button key={s.label} type="button"
                onMouseDown={() => handleSuggestionClick(s.label)}
                onMouseEnter={() => setActiveIndex(navIdx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? "bg-primary/5" : "hover:bg-gray-50"}`}
              >
                <Search className="w-4 h-4 text-gray-300 shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{s.label}</span>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.category}</span>
              </button>
            );
          })}
        </>
      )}
    </motion.div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══════════════════════════ PROMO STRIP ══════════════════════════════ */}
      <AnimatePresence>
        {promoVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-primary-dark text-white text-xs sm:text-sm overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center">
              <div className="flex-1 text-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={promoIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-2 font-medium"
                  >
                    <span>{PROMO_MESSAGES[promoIndex].icon}</span>
                    <span>{PROMO_MESSAGES[promoIndex].text}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <button
                onClick={() => setPromoVisible(false)}
                className="ml-3 p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
                aria-label="Dismiss announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════ MAIN NAVBAR ══════════════════════════════ */}
      <motion.header
        animate={{
          boxShadow: isScrolled
            ? "0 2px 20px rgba(0,0,0,0.12)"
            : "0 1px 4px rgba(0,0,0,0.06)",
        }}
        transition={{ duration: 0.2 }}
        className="sticky top-0 z-50 bg-white"
      >
        {/* ── Main bar ── */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between sm:justify-start gap-3 lg:gap-5 h-14 sm:h-[70px]">

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <div className="relative w-32 sm:w-32 lg:w-36 h-9 sm:h-10">
                <Image
                  src="/logo-black.png"
                  alt="CarmelMart"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* ── Deliver to — desktop only ── */}
            <div className="hidden lg:block relative shrink-0">
              <button
                onClick={() => setShowLocationPicker((v) => !v)}
                onBlur={() => setTimeout(() => setShowLocationPicker(false), 150)}
                className="flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group"
                aria-label="Change delivery location"
              >
                <span className="text-[10px] text-gray-400 font-medium leading-none">Deliver to</span>
                <span className="flex items-center gap-1 text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  {deliveryLocation}
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </span>
              </button>

              <AnimatePresence>
                {showLocationPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs font-semibold text-gray-500">Select delivery state</p>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {NIGERIAN_STATES.map((state) => (
                        <button
                          key={state}
                          onMouseDown={() => {
                            setDeliveryLocation(state);
                            setShowLocationPicker(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                            deliveryLocation === state
                              ? "bg-primary/5 text-primary font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          {state}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Search bar — Amazon style with category selector (sm+) ── */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden sm:block sm:flex-1 min-w-0 relative"
            >
              <div className="relative flex items-stretch h-11 rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-accent transition-colors group">
                {/* Category selector */}
                <div className="relative hidden sm:flex items-center bg-gray-50 border-r border-gray-200 shrink-0">
                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="bg-transparent text-[12px] font-medium text-gray-700 pl-3 pr-7 h-full appearance-none outline-none cursor-pointer"
                    aria-label="Search category"
                  >
                    {SEARCH_CATEGORIES.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                </div>

                {/* Text input */}
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search products, brands, vendors…"
                  className="flex-1 min-w-0 px-3 bg-white outline-none text-sm placeholder:text-gray-400 text-gray-900"
                  autoComplete="off"
                />

                {/* Search button */}
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-dark text-white px-4 sm:px-5 font-semibold text-sm transition-colors shrink-0"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:block">Search</span>
                </button>
              </div>

              {/* Autocomplete dropdown */}
              <AnimatePresence>{suggestionsDropdown}</AnimatePresence>
            </form>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-1 shrink-0">

              {/* Wishlist — desktop only */}
              <Link
                href="/wishlist"
                className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                aria-label={`Wishlist, ${wishlistCount} items`}
              >
                <div className="relative">
                  <Heart className="w-6 h-6 text-gray-700 group-hover:text-primary transition-colors" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-600 hidden lg:block">Wishlist</span>
              </Link>

              {/* Account — Amazon-style two-line, desktop with dropdown */}
              <div
                className="hidden md:block relative"
                onMouseEnter={handleAccountEnter}
                onMouseLeave={handleAccountLeave}
              >
                {isLoading ? (
                  <div className="px-2 py-1">
                    <div className="w-24 h-8 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group"
                    aria-label="Account"
                    aria-expanded={showAccountDropdown}
                  >
                    {isAuthenticated ? (
                      <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                        {initials}
                      </div>
                    ) : (
                      <User className="w-6 h-6 text-gray-700 shrink-0" />
                    )}
                    <div className="hidden lg:flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-gray-400 font-medium">
                        Hello, {isAuthenticated ? firstName.split(" ")[0] : "sign in"}
                      </span>
                      <span className="flex items-center gap-0.5 text-[13px] font-bold text-gray-900">
                        Account & Lists
                        <ChevronDown className="w-3 h-3 text-gray-500 mt-px" />
                      </span>
                    </div>
                  </button>
                )}

                {/* Account dropdown */}
                <AnimatePresence>
                  {showAccountDropdown && !isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      onMouseEnter={handleAccountEnter}
                      onMouseLeave={handleAccountLeave}
                      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                    >
                      {isAuthenticated ? (
                        <>
                          <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs text-gray-500 capitalize">{displayRole}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="py-1">
                            {accountLinks.map(({ label, href, icon: Icon }) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setShowAccountDropdown(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
                              >
                                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                                {label}
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-gray-100 py-1">
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="w-4 h-4 shrink-0" />
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 space-y-2">
                          <p className="text-xs text-gray-500 mb-3">Sign in for the best experience</p>
                          <Link href="/login" onClick={() => setShowAccountDropdown(false)}>
                            <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
                              Sign In
                            </button>
                          </Link>
                          <Link href="/register" onClick={() => setShowAccountDropdown(false)}>
                            <button className="w-full border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                              Create Account
                            </button>
                          </Link>
                          <div className="pt-2 border-t border-gray-100 text-center">
                            <Link href="/register?as=vendor" onClick={() => setShowAccountDropdown(false)}>
                              <span className="text-xs text-primary hover:underline font-medium">
                                Sell on CarmelMart →
                              </span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Returns & Orders — desktop only */}
              <Link
                href={isAuthenticated ? "/my-account/orders" : "/login"}
                className="hidden lg:flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group"
                aria-label="Returns and Orders"
              >
                <span className="text-[10px] text-gray-400 font-medium leading-none">Returns</span>
                <span className="text-[13px] font-bold text-gray-900">& Orders</span>
              </Link>

              {/* Cart — with hover preview */}
              <div
                className="relative"
                onMouseEnter={handleCartEnter}
                onMouseLeave={handleCartLeave}
              >
                <Link
                  href="/cart"
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  aria-label={`Cart, ${cartCount} items`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-gray-800 group-hover:text-primary transition-colors" />
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 1.4 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-accent text-white text-[11px] font-bold rounded-full flex items-center justify-center"
                      >
                        {cartCount > 99 ? "99+" : cartCount}
                      </motion.span>
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col items-start leading-tight">
                    {cartCount > 0 ? (
                      <span className="text-[10px] text-gray-400">₦{cartTotal.toLocaleString()}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Empty</span>
                    )}
                    <span className="text-[13px] font-bold text-gray-900">Cart</span>
                  </div>
                </Link>

                {/* Cart hover preview */}
                <AnimatePresence>
                  {showCartPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      onMouseEnter={handleCartEnter}
                      onMouseLeave={handleCartLeave}
                      className="hidden md:block absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                    >
                      {cartItems.length === 0 ? (
                        <div className="p-6 text-center">
                          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-gray-900 mb-1">Your cart is empty</p>
                          <p className="text-xs text-gray-400 mb-4">Find something you love</p>
                          <Link href="/shop">
                            <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
                              Start Shopping
                            </button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">My Cart</span>
                            <span className="text-xs text-gray-400">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                            {cartItems.slice(0, 3).map((item) => (
                              <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                  {item.image ? (
                                    <Image src={item.image} alt={item.name} width={44} height={44} className="object-cover w-full h-full" />
                                  ) : (
                                    <Package className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                                </div>
                                <p className="text-xs font-bold text-primary shrink-0">
                                  ₦{(item.price * item.quantity).toLocaleString()}
                                </p>
                              </div>
                            ))}
                            {cartItems.length > 3 && (
                              <p className="px-4 py-2 text-xs text-gray-400 text-center">
                                +{cartItems.length - 3} more item{cartItems.length - 3 !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-600">Subtotal</span>
                              <span className="text-sm font-bold text-gray-900">₦{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex gap-2">
                              <Link href="/cart" className="flex-1">
                                <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                                  View Cart
                                </button>
                              </Link>
                              <Link href="/checkout" className="flex-1">
                                <button className="w-full bg-primary text-white py-2 rounded-xl text-xs font-semibold hover:bg-primary-dark transition-colors">
                                  Checkout
                                </button>
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hamburger — mobile only */}
              <div className="md:hidden flex items-center">
                <div className="w-px h-6 bg-gray-200 mr-2" />
                <motion.button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2.5 text-gray-700 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  whileTap={{ scale: 0.93 }}
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* ── Mobile-only full-width search row ── */}
          <div className="sm:hidden px-3 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="flex items-stretch h-11 rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-accent transition-colors">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search products, brands, vendors…"
                  className="flex-1 min-w-0 px-4 bg-white outline-none text-sm placeholder:text-gray-400 text-gray-900"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center bg-accent hover:bg-accent-dark text-white px-4 font-semibold transition-colors shrink-0"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <AnimatePresence>{suggestionsDropdown}</AnimatePresence>
            </form>
          </div>
        </div>

        {/* ══════════════════════ CATEGORY BAR ═════════════════════════════════ */}
        <div
          className="relative bg-primary border-t border-white/10"
          onMouseLeave={() => { megaMenuTimer.current = setTimeout(() => setHoveredCategory(null), 150); }}
        >
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
              <div className="flex items-center h-10">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.name;
                  const isAllDepts = cat.name === "All Departments";
                  const hasSubs = !!CATEGORY_SUBS[cat.name];
                  return (
                    <div
                      key={cat.name}
                      className="relative h-full shrink-0 flex items-center"
                      onMouseEnter={() => {
                        clearTimeout(megaMenuTimer.current);
                        setHoveredCategory(hasSubs ? cat.name : null);
                      }}
                    >
                      <Link
                        href={cat.href}
                        onClick={() => { setActiveCategory(cat.name); setHoveredCategory(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all h-full border-b-2 ${
                          isActive
                            ? "text-white border-accent"
                            : cat.hot
                            ? "text-accent hover:text-accent border-transparent hover:border-accent/50"
                            : "text-white/80 hover:text-white border-transparent hover:border-white/40"
                        } ${isAllDepts ? "font-bold mr-1" : ""}`}
                      >
                        {Icon && (
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${
                            cat.hot && !isActive ? "text-accent" : isActive ? "text-accent" : ""
                          }`} />
                        )}
                        {cat.name}
                        {cat.hot && !isActive && (
                          <span className="ml-0.5 text-accent font-black text-[10px]">⚡</span>
                        )}
                        {hasSubs && <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mega-menu dropdown */}
          <AnimatePresence>
            {hoveredCategory && CATEGORY_SUBS[hoveredCategory] && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="hidden md:block absolute left-0 right-0 top-full bg-white shadow-2xl border-t-2 border-accent z-50"
                onMouseEnter={() => clearTimeout(megaMenuTimer.current)}
                onMouseLeave={() => { megaMenuTimer.current = setTimeout(() => setHoveredCategory(null), 150); }}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                  <div className="flex items-start gap-8">
                    {/* Sub-category links */}
                    <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {CATEGORY_SUBS[hoveredCategory].subs.map((sub) => (
                        <Link
                          key={sub}
                          href={`${CATEGORY_SUBS[hoveredCategory].href}&sub=${encodeURIComponent(sub.toLowerCase())}`}
                          onClick={() => setHoveredCategory(null)}
                          className="px-3 py-2 text-sm text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors font-medium whitespace-nowrap"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                    {/* Browse all CTA */}
                    <Link
                      href={CATEGORY_SUBS[hoveredCategory].href}
                      onClick={() => setHoveredCategory(null)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full transition-colors whitespace-nowrap"
                    >
                      Browse all {hoveredCategory} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* ══════════════════════ MOBILE DRAWER ════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white z-50 md:hidden shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Close button */}
              <div className="absolute -left-12 top-4 z-10">
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 bg-white text-primary rounded-full shadow-xl flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Drawer header */}
              <div className="bg-primary text-white shrink-0">
                <div className="px-5 pt-5 pb-2">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/25 text-white text-base font-bold flex items-center justify-center ring-2 ring-white/30 shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate">{displayName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-sm text-white/80 capitalize">{displayRole}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center ring-2 ring-white/30 shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">Welcome!</p>
                          <p className="text-sm text-white/75">Sign in to your account</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full bg-white text-primary py-2 rounded-xl text-sm font-bold">
                            Sign In
                          </button>
                        </Link>
                        <Link href="/register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full border-2 border-white text-white py-2 rounded-xl text-sm font-bold">
                            Register
                          </button>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
                <div className="h-5 bg-white" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

                {/* Quick-action tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Wishlist",  sub: `${wishlistCount} saved`,  href: "/wishlist",         icon: Heart,       badge: 0         },
                    { label: "Cart",      sub: `${cartCount} items`,      href: "/cart",             icon: ShoppingCart, badge: cartCount },
                    ...(isAuthenticated && isCustomer ? [{ label: "My Account",  sub: "Profile & orders", href: "/my-account",       icon: User,       badge: 0 }] : []),
                    ...(isAuthenticated && isVendor   ? [{ label: "Dashboard",   sub: "Manage your store", href: "/vendor/dashboard", icon: TrendingUp, badge: 0 }] : []),
                    { label: "Orders",    sub: "Track & returns",         href: isAuthenticated ? "/my-account/orders" : "/login", icon: RotateCcw, badge: 0 },
                  ].map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <Link key={tile.href} href={tile.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <motion.div
                          whileTap={{ scale: 0.97 }}
                          className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Icon className="w-5 h-5 text-primary" />
                            {tile.badge > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {tile.badge > 9 ? "9+" : tile.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-gray-900 leading-none">{tile.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{tile.sub}</p>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>

                {/* Category grid */}
                <div>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span>Shop by Category</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.filter((c) => c.name !== "All Departments").map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <Link key={cat.name} href={cat.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <motion.div
                            whileTap={{ scale: 0.97 }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                              cat.hot
                                ? "bg-accent/10 border-accent/30"
                                : "bg-gray-50 border-gray-100 hover:bg-primary/5 hover:border-primary/20"
                            }`}
                          >
                            {Icon && (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                cat.hot ? "bg-accent/20" : "bg-primary/10"
                              }`}>
                                <Icon className={`w-4 h-4 ${cat.hot ? "text-accent-dark" : "text-primary"}`} />
                              </div>
                            )}
                            <span className={`text-[11px] font-semibold text-center leading-tight ${
                              cat.hot ? "text-accent-dark" : "text-gray-800"
                            }`}>
                              {cat.name}
                            </span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Account links (authenticated only) */}
                {isAuthenticated && (
                  <div className="border-t border-gray-100 pt-1 space-y-0.5">
                    {accountLinks.map(({ label, href, icon: Icon }) => (
                      <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)}>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        >
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium">{label}</span>
                        </motion.div>
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                )}

                {/* Vendor CTA (guest) */}
                {!isAuthenticated && (
                  <div className="border-t border-gray-100 pt-4">
                    <Link href="/register?as=vendor" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
                        <div>
                          <p className="text-sm font-semibold text-primary">Sell on CarmelMart</p>
                          <p className="text-xs text-gray-500 mt-0.5">Join thousands of verified vendors</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
