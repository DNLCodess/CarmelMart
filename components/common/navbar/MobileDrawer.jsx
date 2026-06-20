"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, ShoppingCart, User, TrendingUp, Package,
  BadgeCheck, ArrowRight, LogOut, Download, Settings,
  Bike, LayoutDashboard, Store, Wallet, ShieldCheck,
  Users, Tag, ClipboardList, Calculator,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SuggestionsDropdown } from "./SearchBar";
import { Search } from "lucide-react";
import {
  ShoppingBag, Shirt, Home as HomeIcon, Wrench, Music,
} from "lucide-react";
import { usePWAInstall } from "@/lib/pwa-install-context";

const SLUG_ICON = {
  consumables:         ShoppingBag,
  apparels:            Shirt,
  "home-living":       HomeIcon,
  "electronics-tools": Wrench,
  "leisure-lifestyle": Music,
};

// ── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ label, sub, href, icon: Icon, badge = 0, onClick, fullWidth = false }) {
  const inner = (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all ${fullWidth ? "flex-row justify-start gap-3 px-4" : ""}`}
    >
      <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
        <Icon className="w-5 h-5 text-primary" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <div className={fullWidth ? "text-left" : "text-center"}>
        <p className="text-sm font-semibold text-gray-900 leading-none">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );

  if (onClick) {
    return <button className={fullWidth ? "w-full" : ""} onClick={onClick}>{inner}</button>;
  }
  return <Link href={href} className={fullWidth ? "w-full" : ""}>{inner}</Link>;
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      <div className="h-px flex-1 bg-gray-100" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </h3>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileDrawer({
  isOpen, onClose,
  // auth
  isAuthenticated, isCustomer, isVendor, isRider, isAdmin, isAccountant,
  initials, displayName, displayRole,
  accountLinks, onSignOut,
  // cart / wishlist counts
  cartCount, wishlistCount,
  // categories
  categories,
  // search props
  searchQuery, setSearchQuery,
  showSuggestions, setShowSuggestions,
  activeIndex, setActiveIndex,
  debouncedQuery, liveResults, liveLoading, filteredSuggestions,
  recentSearches, clearRecentSearches,
  searchCategories,
  onSearchSubmit, onSuggestionClick, onProductClick, onSubmitAll, onSearchKeyDown,
}) {
  const router = useRouter();
  const { canInstall, isIOS, triggerInstall } = usePWAInstall() ?? {};

  const isGuest = !isAuthenticated;
  const isShopper = isGuest || isCustomer;

  const close = (href) => { onClose(); if (href) router.push(href); };

  // ── Role-aware quick tiles ────────────────────────────────────────────────
  const tiles = (() => {
    if (isAdmin) return [
      { label: "Admin Panel",  sub: "Platform overview",    href: "/admin/dashboard",  icon: LayoutDashboard },
      { label: "Users",        sub: "Manage accounts",      href: "/admin/users",       icon: Users           },
      { label: "Orders",       sub: "All platform orders",  href: "/admin/orders",      icon: ClipboardList   },
      { label: "Vendors",      sub: "Vendor management",    href: "/admin/vendors",     icon: Store           },
    ];
    if (isRider) return [
      { label: "My Deliveries", sub: "Active & recent",     href: "/rider/orders",      icon: Bike,    fullWidth: true },
    ];
    if (isAccountant) return [
      { label: "Finance Portal", sub: "Revenue & fees",      href: "/accountant/dashboard", icon: Calculator, fullWidth: true },
    ];
    if (isVendor) return [
      { label: "Dashboard",    sub: "Store overview",       href: "/vendor/dashboard",  icon: TrendingUp      },
      { label: "Products",     sub: "Manage listings",      href: "/vendor/products",   icon: Store           },
      { label: "Orders",       sub: "Incoming orders",      href: "/vendor/orders",     icon: Package         },
      { label: "Wallet",       sub: "Earnings & payouts",   href: "/vendor/wallet",     icon: Wallet          },
    ];
    // customer or guest
    return [
      { label: "Wishlist",  sub: `${wishlistCount} saved`, href: "/wishlist",                                      icon: Heart,        badge: wishlistCount },
      { label: "Cart",      sub: `${cartCount} items`,     href: "/cart",                                           icon: ShoppingCart, badge: cartCount     },
      { label: "My Orders", sub: "Track & returns",        href: isAuthenticated ? "/orders" : "/login",            icon: Package                            },
      ...(isAuthenticated ? [{ label: "My Account", sub: "Profile & settings", href: "/my-account", icon: User }] : []),
    ];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
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
                onClick={onClose}
                className="w-10 h-10 bg-white text-primary rounded-full shadow-xl flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Header */}
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
                      <Link href="/login" className="flex-1" onClick={onClose}>
                        <button className="w-full bg-white text-primary py-2 rounded-xl text-sm font-bold">Sign In</button>
                      </Link>
                      <Link href="/register" className="flex-1" onClick={onClose}>
                        <button className="w-full border-2 border-white text-white py-2 rounded-xl text-sm font-bold">Register</button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
              <div className="h-5 bg-white" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">

              {/* Quick-action tiles */}
              <div className={isRider ? "flex flex-col gap-2.5" : "grid grid-cols-2 gap-2.5"}>
                {tiles.map((tile) => (
                  <Tile key={tile.href} {...tile} onClick={() => close(tile.href)} fullWidth={tile.fullWidth} />
                ))}
              </div>

              {/* Install app card */}
              {canInstall && (
                <motion.button
                  onClick={() => { onClose(); if (!isIOS) triggerInstall?.(); }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Download className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold leading-tight">Install CarmelMart App</p>
                      <p className="text-xs text-white/70 mt-0.5">Faster • Offline • Free</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4.5 h-4.5 text-white/70 shrink-0" />
                </motion.button>
              )}

              {/* Search — shoppers only */}
              {isShopper && (
                <div className="relative">
                  <form onSubmit={onSearchSubmit}>
                    <div className="flex items-stretch h-11 rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-accent transition-colors">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
                        onKeyDown={onSearchKeyDown}
                        placeholder="Search products…"
                        className="flex-1 min-w-0 px-4 bg-white outline-none text-sm placeholder:text-gray-400 text-gray-900"
                        autoComplete="off"
                      />
                      <button type="submit" className="flex items-center justify-center bg-accent hover:bg-accent-dark text-white px-4 transition-colors shrink-0" aria-label="Search">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    <AnimatePresence>
                      {showSuggestions && (
                        <SuggestionsDropdown
                          searchQuery={searchQuery}
                          debouncedQuery={debouncedQuery}
                          liveResults={liveResults}
                          liveLoading={liveLoading}
                          filteredSuggestions={filteredSuggestions}
                          recentSearches={recentSearches}
                          clearRecentSearches={clearRecentSearches}
                          activeIndex={activeIndex}
                          onSuggestionClick={onSuggestionClick}
                          onProductClick={onProductClick}
                          onSubmitAll={onSubmitAll}
                        />
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              )}

              {/* Category grid — shoppers only */}
              {isShopper && (categories ?? []).length > 0 && (
                <div>
                  <SectionDivider label="Shop by Category" />
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const Icon = SLUG_ICON[cat.slug] ?? Tag;
                      return (
                        <button key={cat.id} className="w-full" onClick={() => close(`/shop?category=${cat.slug}`)}>
                          <motion.div
                            whileTap={{ scale: 0.97 }}
                            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border bg-gray-50 border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm">
                              <Icon className="w-4.5 h-4.5 text-primary" />
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight text-gray-800">{cat.name}</span>
                          </motion.div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account links */}
              {isAuthenticated && (
                <div className="border-t border-gray-100 pt-1 space-y-0.5">
                  <SectionDivider label="Account" />
                  {accountLinks.map(({ label, href, icon: Icon }) => (
                    <Link key={href} href={href} onClick={onClose}>
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
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              )}

              {/* Vendor CTA — guests only */}
              {isGuest && (
                <div className="border-t border-gray-100 pt-4">
                  <Link href="/register?as=vendor" onClick={onClose}>
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
  );
}
