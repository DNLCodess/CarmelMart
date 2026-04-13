"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, ShoppingCart, User, TrendingUp, RotateCcw,
  BadgeCheck, ArrowRight, LogOut, Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CATEGORIES } from "./navbar.data";
import { SuggestionsDropdown } from "./SearchBar";
import { Search } from "lucide-react";
import { AnimatePresence as AP } from "framer-motion";
import { usePWAInstall } from "@/lib/pwa-install-context";

export default function MobileDrawer({
  isOpen, onClose,
  // auth
  isAuthenticated, initials, displayName, displayRole,
  accountLinks, onSignOut,
  // cart / wishlist counts
  cartCount, wishlistCount,
  // search
  searchQuery, setSearchQuery,
  showSuggestions, setShowSuggestions,
  activeIndex, setActiveIndex,
  debouncedQuery, liveResults, liveLoading, filteredSuggestions,
  recentSearches, clearRecentSearches,
  onSearchSubmit, onSuggestionClick, onProductClick, onSubmitAll, onSearchKeyDown,
}) {
  const router = useRouter();
  const { canInstall, isIOS, triggerInstall } = usePWAInstall() ?? {};

  const handleCategoryClick = (href) => {
    onClose();
    router.push(href);
  };

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
                        <button className="w-full bg-white text-primary py-2 rounded-xl text-sm font-bold">
                          Sign In
                        </button>
                      </Link>
                      <Link href="/register" className="flex-1" onClick={onClose}>
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">

              {/* Quick-action tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Wishlist",   sub: `${wishlistCount} saved`,   href: "/wishlist",         icon: Heart,        badge: 0         },
                  { label: "Cart",       sub: `${cartCount} items`,       href: "/cart",             icon: ShoppingCart, badge: cartCount },
                  ...(isAuthenticated ? [{ label: "My Account", sub: "Profile & orders", href: "/my-account",       icon: User,       badge: 0 }] : []),
                  ...(isAuthenticated ? [{ label: "Dashboard",  sub: "Manage your store", href: "/vendor/dashboard", icon: TrendingUp, badge: 0 }] : []),
                  { label: "Orders",    sub: "Track & returns",           href: isAuthenticated ? "/my-account/orders" : "/login", icon: RotateCcw, badge: 0 },
                ].map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <Link key={tile.href} href={tile.href} onClick={onClose}>
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
                      <button
                        key={cat.name}
                        onClick={() => handleCategoryClick(cat.href)}
                        className="w-full"
                      >
                        <motion.div
                          whileTap={{ scale: 0.97 }}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
                            cat.hot
                              ? "bg-accent/5 border-accent/20 hover:bg-accent/10"
                              : "bg-gray-50 border-gray-100 hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            cat.hot ? "bg-accent/10" : "bg-white shadow-sm"
                          }`}>
                            <Icon className={`w-4.5 h-4.5 ${cat.hot ? "text-accent" : "text-primary"}`} />
                          </div>
                          <span className={`text-[11px] font-semibold text-center leading-tight ${
                            cat.hot ? "text-accent-dark" : "text-gray-800"
                          }`}>
                            {cat.name}
                          </span>
                        </motion.div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account links */}
              {isAuthenticated && (
                <div className="border-t border-gray-100 pt-1 space-y-0.5">
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

              {/* Vendor CTA (guest) */}
              {!isAuthenticated && (
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
