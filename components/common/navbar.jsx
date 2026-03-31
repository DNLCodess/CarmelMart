"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingBag, User, Heart, Menu, X, LogOut,
  Zap, Laptop, Shirt, Home as HomeIcon, Gem, Dumbbell,
  BookOpen, Package, Settings, TrendingUp, Bell,
  BadgeCheck, ArrowRight, Phone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { logoutAction } from "@/app/actions/auth";
import { useQueryClient } from "@tanstack/react-query";

// ─── Static data ─────────────────────────────────────────────────────────────

const PROMO_MESSAGES = [
  { text: "Free delivery on orders above ₦10,000", icon: "🚚" },
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

const CATEGORIES = [
  { name: "All",          href: "/shop",                         icon: null      },
  { name: "Fashion",      href: "/shop?category=fashion",        icon: Shirt     },
  { name: "Electronics",  href: "/shop?category=electronics",    icon: Laptop    },
  { name: "Phones",       href: "/shop?category=phones",         icon: Phone     },
  { name: "Home",         href: "/shop?category=home-living",    icon: HomeIcon  },
  { name: "Beauty",       href: "/shop?category=beauty",         icon: Gem       },
  { name: "Sports",       href: "/shop?category=sports",         icon: Dumbbell  },
  { name: "Books",        href: "/shop?category=books",          icon: BookOpen  },
  { name: "Flash Sale",   href: "/shop?sort=flash_sale",         icon: Zap,  hot: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Navbar() {
  // UI state
  const [isScrolled,          setIsScrolled]          = useState(false);
  const [promoIndex,          setPromoIndex]          = useState(0);
  const [promoVisible,        setPromoVisible]        = useState(true);
  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [searchQuery,         setSearchQuery]         = useState("");
  const [showSuggestions,     setShowSuggestions]     = useState(false);
  const [showCartPreview,     setShowCartPreview]     = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [activeCategory,      setActiveCategory]      = useState("All");

  // Refs
  const cartHoverTimer    = useRef(null);
  const accountHoverTimer = useRef(null);

  // Store & auth
  const router      = useRouter();
  const pathname    = usePathname();
  const queryClient = useQueryClient();

  const { user, role, isAuthenticated, isLoading, isVendor, isCustomer, isAdmin } = useAuth();

  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = useCartStore((s) => s.itemCount);
  const cartTotal  = useCartStore((s) => s.total);
  const wishlistCount = useUIStore((s) => s.wishlist.length);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email?.split("@")[0] ?? "Account";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Customer";
  const initials    = displayName.slice(0, 2).toUpperCase();

  // Search suggestions
  const filteredSuggestions = searchQuery.length >= 2
    ? SEARCH_SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : SEARCH_SUGGESTIONS.slice(0, 5);

  // Account links (role-gated)
  const accountLinks = isAuthenticated ? [
    ...(isCustomer ? [{ label: "My Account",       href: "/my-account",             icon: User        }] : []),
    ...(isVendor   ? [{ label: "Vendor Dashboard", href: "/vendor/dashboard",       icon: TrendingUp  }] : []),
    ...(isAdmin    ? [{ label: "Admin Panel",       href: "/admin",                  icon: Settings    }] : []),
    { label: "My Orders",      href: "/my-account/orders",        icon: Package  },
    { label: "Notifications",  href: "/my-account/notifications", icon: Bell     },
    { label: "Settings",       href: "/my-account/settings",      icon: Settings },
  ] : [];

  // ── Callbacks ───────────────────────────────────────────────────────────────

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }, [router, searchQuery]);

  const handleSuggestionClick = useCallback((label) => {
    setSearchQuery(label);
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    router.push(`/shop?q=${encodeURIComponent(label)}`);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await logoutAction();
    queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    setIsMobileMenuOpen(false);
    setShowAccountDropdown(false);
  }, [queryClient]);

  // ── Hover helpers ───────────────────────────────────────────────────────────

  const handleCartEnter    = () => { clearTimeout(cartHoverTimer.current);    setShowCartPreview(true);      };
  const handleCartLeave    = () => { cartHoverTimer.current    = setTimeout(() => setShowCartPreview(false),    180); };
  const handleAccountEnter = () => { clearTimeout(accountHoverTimer.current); setShowAccountDropdown(true);   };
  const handleAccountLeave = () => { accountHoverTimer.current = setTimeout(() => setShowAccountDropdown(false), 180); };

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Promo rotation
  useEffect(() => {
    if (!promoVisible) return;
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, [promoVisible]);

  // Mobile menu — lock scroll + Escape
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    const onKey = (e) => { if (e.key === "Escape") setIsMobileMenuOpen(false); };
    if (isMobileMenuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen]);

  // Cleanup hover timers on unmount
  useEffect(() => () => {
    clearTimeout(cartHoverTimer.current);
    clearTimeout(accountHoverTimer.current);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════ PROMO STRIP ═══════════════════════════ */}
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

      {/* ═══════════════════════════ MAIN NAVBAR ═══════════════════════════ */}
      <motion.header
        animate={{
          boxShadow: isScrolled
            ? "0 2px 16px rgba(0,0,0,0.10)"
            : "0 1px 3px rgba(0,0,0,0.05)",
        }}
        transition={{ duration: 0.2 }}
        className="sticky top-0 z-50 bg-white"
      >
        {/* ── Main bar ── */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 h-14 sm:h-16 lg:h-[68px]">

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <div className="relative w-24 sm:w-28 lg:w-32 h-8 sm:h-9 lg:h-10">
                <Image
                  src="/logo-black.png"
                  alt="CarmelMart"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* ── Search — flex-1, always visible ── */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 min-w-0 relative"
            >
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none z-10" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search products, brands…"
                  className="w-full pl-10 sm:pl-11 pr-4 sm:pr-24 py-2 sm:py-2.5 rounded-full border-2 border-gray-200 focus:border-primary outline-none bg-gray-50 focus:bg-white transition-all text-sm placeholder:text-gray-400"
                  autoComplete="off"
                />
                {/* Desktop submit button */}
                <button
                  type="submit"
                  className="hidden sm:flex absolute right-1.5 top-1/2 -translate-y-1/2 items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  Search
                </button>
                {/* Mobile submit icon */}
                <button
                  type="submit"
                  className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  aria-label="Search"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {searchQuery.length >= 2 ? "Suggestions" : "Trending Searches"}
                      </p>
                    </div>
                    {filteredSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
                    ) : (
                      filteredSuggestions.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onMouseDown={() => handleSuggestionClick(s.label)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Search className="w-4 h-4 text-gray-300 shrink-0" />
                          <span className="text-sm text-gray-900 flex-1">{s.label}</span>
                          <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.category}</span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">

              {/* Wishlist — desktop only */}
              <Link
                href="/wishlist"
                className="hidden md:flex flex-col items-center p-2 text-gray-600 hover:text-primary rounded-xl transition-colors group"
                aria-label={`Wishlist, ${wishlistCount} items`}
              >
                <div className="relative">
                  <Heart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 hidden lg:block font-medium leading-none">Wishlist</span>
              </Link>

              {/* Cart — desktop with hover preview, mobile with badge */}
              <div
                className="relative"
                onMouseEnter={handleCartEnter}
                onMouseLeave={handleCartLeave}
              >
                <Link
                  href="/cart"
                  className="flex flex-col items-center p-2 text-gray-600 hover:text-primary rounded-xl transition-colors group"
                  aria-label={`Cart, ${cartCount} items`}
                >
                  <div className="relative">
                    <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 hidden lg:block font-medium leading-none">Cart</span>
                </Link>

                {/* ── Cart mini-preview (desktop hover) ── */}
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
                          <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-gray-900 mb-1">Your cart is empty</p>
                          <p className="text-xs text-gray-400 mb-4">Find something you love</p>
                          <Link href="/shop">
                            <button className="w-full bg-primary text-white py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors">
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
                                <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-full text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                                  View Cart
                                </button>
                              </Link>
                              <Link href="/checkout" className="flex-1">
                                <button className="w-full bg-primary text-white py-2 rounded-full text-xs font-semibold hover:bg-primary-dark transition-colors">
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

              {/* Account — desktop with dropdown */}
              <div
                className="hidden md:block relative"
                onMouseEnter={handleAccountEnter}
                onMouseLeave={handleAccountLeave}
              >
                {isLoading ? (
                  <div className="p-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <button
                    className="flex flex-col items-center p-2 text-gray-600 hover:text-primary rounded-xl transition-colors group"
                    aria-label="Account"
                    aria-expanded={showAccountDropdown}
                  >
                    {isAuthenticated ? (
                      <div className="w-7 h-7 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        {initials}
                      </div>
                    ) : (
                      <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[10px] mt-0.5 hidden lg:block font-medium leading-none">
                      {isAuthenticated ? displayName.split(" ")[0] : "Account"}
                    </span>
                  </button>
                )}

                {/* ── Account dropdown ── */}
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
                      {!isAuthenticated ? (
                        /* Guest state */
                        <div className="p-4 space-y-2">
                          <p className="text-xs text-gray-500 mb-3">Sign in for the best experience</p>
                          <Link href="/login" onClick={() => setShowAccountDropdown(false)}>
                            <button className="w-full bg-primary text-white py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors">
                              Sign In
                            </button>
                          </Link>
                          <Link href="/register" onClick={() => setShowAccountDropdown(false)}>
                            <button className="w-full border-2 border-gray-200 text-gray-700 py-2.5 rounded-full text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                              Create Account
                            </button>
                          </Link>
                          <div className="pt-2 border-t border-gray-100 text-center">
                            <Link href="/vendor/apply" onClick={() => setShowAccountDropdown(false)}>
                              <span className="text-xs text-primary hover:underline font-medium">
                                Sell on CarmelMart →
                              </span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        /* Authenticated state */
                        <>
                          {/* User header */}
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

                          {/* Navigation links */}
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

                          {/* Sign out */}
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
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hamburger — mobile only */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                whileTap={{ scale: 0.93 }}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ CATEGORY BAR ═══════════════════════════ */}
        <div className="bg-primary border-t border-white/10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-0.5 h-9">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.name;
                return (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : cat.hot
                        ? "text-accent hover:bg-white/15 hover:text-accent"
                        : "text-white/85 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    {Icon && (
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${cat.hot && !isActive ? "text-accent" : ""}`} />
                    )}
                    {cat.name}
                    {cat.hot && (
                      <span className="text-accent font-black text-[10px]">⚡</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════ MOBILE DRAWER ═════════════════════════════ */}
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
              {/* Close button — floats outside left edge */}
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

              {/* ── Drawer header — gradient user card ── */}
              <div className="bg-primary text-white shrink-0">
                <div className="px-5 pt-5 pb-2">
                  {isAuthenticated ? (
                    /* Logged-in user card */
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
                    /* Guest card */
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
                          <button className="w-full bg-white text-primary py-2 rounded-full text-sm font-bold">
                            Sign In
                          </button>
                        </Link>
                        <Link href="/register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full border-2 border-white text-white py-2 rounded-full text-sm font-bold">
                            Register
                          </button>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
                {/* Curved bottom sweep into white */}
                <div className="h-5 bg-white" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
              </div>

              {/* ── Drawer body ── */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

                {/* Quick-action tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Wishlist",  sub: `${wishlistCount} saved`,  href: "/wishlist",          icon: Heart,      badge: 0         },
                    { label: "Cart",      sub: `${cartCount} items`,      href: "/cart",              icon: ShoppingBag, badge: cartCount },
                    ...(isAuthenticated && isCustomer ? [{ label: "My Account",  sub: "Profile & orders",    href: "/my-account",        icon: User,        badge: 0         }] : []),
                    ...(isAuthenticated && isVendor   ? [{ label: "Dashboard",   sub: "Manage your store",   href: "/vendor/dashboard",  icon: TrendingUp,  badge: 0         }] : []),
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
                    {CATEGORIES.filter((c) => c.name !== "All").map((cat) => {
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
                    <Link href="/vendor/apply" onClick={() => setIsMobileMenuOpen(false)}>
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
