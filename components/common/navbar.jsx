"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/button";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  const categories = [
    { name: "Fashion", href: "/category/fashion" },
    { name: "Electronics", href: "/category/electronics" },
    { name: "Home & Living", href: "/category/home-living" },
    { name: "Beauty", href: "/category/beauty" },
    { name: "Sports", href: "/category/sports" },
    { name: "Books", href: "/category/books" },
  ];

  const navLinks = [
    {
      name: "Categories",
      items: categories,
    },
    {
      name: "Deals",
      href: "/products?category=deals",
      icon: Tag,
    },
    {
      name: "Trending",
      href: "/trending",
      icon: TrendingUp,
    },
    {
      name: "New Arrivals",
      href: "/new",
      icon: Sparkles,
    },
  ];

  return (
    <>
      {/* Main Navbar */}
      <motion.nav
        initial={false}
        animate={{
          backgroundColor: isScrolled
            ? "rgba(255, 255, 255, 0.98)"
            : "rgba(255, 255, 255, 1)",
          boxShadow: isScrolled
            ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
        className="sticky top-0 z-50 backdrop-blur-xl border-b border-gray-100 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Navigation Row */}
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Left: Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-32 h-32 lg:w-44 lg:h-44 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/logo-black.png"
                    alt="CarmelMart"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center gap-1">
                {navLinks.map((link, index) => (
                  <div key={index} className="relative">
                    {link.items ? (
                      <div
                        className="relative"
                        onMouseEnter={() => {
                          setActiveDropdown(link.name);
                          setHoveredLink(link.name);
                        }}
                        onMouseLeave={() => {
                          setActiveDropdown(null);
                          setHoveredLink(null);
                        }}
                      >
                        <motion.button
                          className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg overflow-hidden group"
                          whileHover={{ scale: 1.02 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 17,
                          }}
                        >
                          {/* Hover background */}
                          <motion.div
                            className="absolute inset-0 bg-linear-to-r from-primary/5 to-primary/10 rounded-lg"
                            initial={{ x: "-100%" }}
                            animate={{
                              x: hoveredLink === link.name ? 0 : "-100%",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />

                          {/* Content */}
                          <span
                            className={`relative z-10 transition-colors duration-300 ${
                              hoveredLink === link.name ? "text-primary" : ""
                            }`}
                          >
                            {link.name}
                          </span>
                          <ChevronDown
                            className={`relative z-10 w-4 h-4 transition-all duration-300 ${
                              activeDropdown === link.name ? "rotate-180" : ""
                            } ${
                              hoveredLink === link.name ? "text-primary" : ""
                            }`}
                          />

                          {/* Bottom border animation */}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary to-accent"
                            initial={{ scaleX: 0 }}
                            animate={{
                              scaleX: hoveredLink === link.name ? 1 : 0,
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          />
                        </motion.button>

                        <AnimatePresence>
                          {activeDropdown === link.name && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{
                                duration: 0.2,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                            >
                              <div className="py-2">
                                {link.items.map((item, idx) => (
                                  <Link
                                    key={idx}
                                    href={item.href}
                                    className="relative block px-4 py-2.5 text-sm text-gray-700 transition-all duration-200 group/item overflow-hidden"
                                  >
                                    <motion.div
                                      className="absolute inset-0 bg-linear-to-r from-primary/5 to-accent/5"
                                      initial={{ x: "-100%" }}
                                      whileHover={{ x: 0 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: "easeOut",
                                      }}
                                    />
                                    <span className="relative z-10 group-hover/item:text-primary transition-colors duration-200">
                                      {item.name}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        href={link.href}
                        onMouseEnter={() => setHoveredLink(link.name)}
                        onMouseLeave={() => setHoveredLink(null)}
                      >
                        <motion.div
                          className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg overflow-hidden group"
                          whileHover={{ scale: 1.02 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 17,
                          }}
                        >
                          {/* Hover background */}
                          <motion.div
                            className="absolute inset-0 bg-linear-to-r from-primary/5 to-primary/10 rounded-lg"
                            initial={{ x: "-100%" }}
                            animate={{
                              x: hoveredLink === link.name ? 0 : "-100%",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />

                          {/* Content */}
                          {link.icon && (
                            <link.icon
                              className={`relative z-10 w-4 h-4 transition-colors duration-300 ${
                                hoveredLink === link.name ? "text-primary" : ""
                              }`}
                            />
                          )}
                          <span
                            className={`relative z-10 transition-colors duration-300 ${
                              hoveredLink === link.name ? "text-primary" : ""
                            }`}
                          >
                            {link.name}
                          </span>

                          {/* Bottom border animation */}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary to-accent"
                            initial={{ scaleX: 0 }}
                            animate={{
                              scaleX: hoveredLink === link.name ? 1 : 0,
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          />
                        </motion.div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Search Bar (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 rounded-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-300 text-sm bg-gray-50/50 focus:bg-white hover:bg-white"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Wishlist */}
              <Link href="/wishlist" className="hidden md:block">
                <motion.button
                  className="relative p-2 lg:p-2.5 text-gray-700 rounded-full transition-all duration-300 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-primary/5 rounded-full"
                    initial={{ scale: 0 }}
                    whileHover={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                  <Heart className="relative z-10 w-5 h-5 lg:w-6 lg:h-6 group-hover:text-primary transition-colors duration-300" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-full ring-2 ring-white"></span>
                </motion.button>
              </Link>

              {/* Cart */}
              <Link href="/cart">
                <motion.button
                  className="relative p-2 lg:p-2.5 text-gray-700 rounded-full transition-all duration-300 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-primary/5 rounded-full"
                    initial={{ scale: 0 }}
                    whileHover={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                  <ShoppingBag className="relative z-10 w-5 h-5 lg:w-6 lg:h-6 group-hover:text-primary transition-colors duration-300" />
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-linear-to-r from-primary to-accent text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    3
                  </span>
                </motion.button>
              </Link>

              {/* Account */}
              <Link href="/register" className="hidden lg:block">
                <Button
                  variant="primary"
                  size="md"
                  className="rounded-full shadow-md hover:shadow-primary/30"
                >
                  Register as a Vendor
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden relative p-2 text-gray-700 rounded-lg transition-all duration-300 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-primary/5 rounded-lg"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
                <Menu className="relative z-10 w-6 h-6 group-hover:text-primary transition-colors duration-300" />
              </motion.button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-primary focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-300 text-sm bg-gray-50/50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 overflow-y-auto lg:hidden shadow-2xl"
            >
              {/* Sidebar Header */}
              <div className="sticky top-0 z-10 bg-linear-to-br from-primary via-primary-dark to-primary text-white">
                {/* Close Button - Floating Style */}
                <div className="absolute -left-14 top-6">
                  <motion.button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-12 h-12 bg-white text-primary rounded-full shadow-2xl flex items-center justify-center hover:shadow-primary/20 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                <div className="p-6 pb-5">
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-2 ring-white/30"
                    >
                      <User className="w-6 h-6" />
                    </motion.div>
                    <div>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="font-bold text-lg"
                      >
                        Welcome Back!
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="text-sm opacity-90"
                      >
                        Sign in to access your account
                      </motion.p>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3"
                  >
                    <Link
                      href="/login"
                      className="flex-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <Button
                          variant="white"
                          size="sm"
                          className="w-full text-primary font-semibold shadow-lg hover:shadow-xl transition-shadow duration-300"
                        >
                          Sign In
                        </Button>
                      </motion.div>
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                        >
                          Register
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>

                {/* Decorative wave */}
                <div
                  className="h-4 bg-white"
                  style={{
                    clipPath: "ellipse(60% 100% at 50% 100%)",
                  }}
                ></div>
              </div>

              {/* Sidebar Content */}
              <div className="p-6 space-y-6">
                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <Link
                    href="/wishlist"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-linear-to-br from-gray-50 to-gray-100 hover:from-primary/5 hover:to-primary/10 border border-gray-100 hover:border-primary/20 transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                        <Heart className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          Wishlist
                        </p>
                        <p className="text-xs text-gray-500">0 items</p>
                      </div>
                    </motion.div>
                  </Link>
                  <Link href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-linear-to-br from-gray-50 to-gray-100 hover:from-primary/5 hover:to-primary/10 border border-gray-100 hover:border-primary/20 transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300 relative">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                          3
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          Cart
                        </p>
                        <p className="text-xs text-gray-500">3 items</p>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Navigation Links */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                    <span>Browse</span>
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                  </h3>
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + index * 0.05 }}
                    >
                      {link.items ? (
                        <div className="space-y-1">
                          <motion.button
                            onClick={() =>
                              setActiveDropdown(
                                activeDropdown === link.name ? null : link.name
                              )
                            }
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-between p-3.5 text-gray-900 font-semibold rounded-xl hover:bg-linear-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300 group"
                          >
                            <span className="group-hover:text-primary transition-colors duration-300">
                              {link.name}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 transition-all duration-300 group-hover:text-primary ${
                                activeDropdown === link.name ? "rotate-180" : ""
                              }`}
                            />
                          </motion.button>
                          <AnimatePresence>
                            {activeDropdown === link.name && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="pl-4 pr-2 space-y-1 pt-1">
                                  {link.items.map((item, idx) => (
                                    <Link
                                      key={idx}
                                      href={item.href}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <motion.div
                                        whileHover={{ x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="block p-3 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200 text-sm font-medium"
                                      >
                                        {item.name}
                                      </motion.div>
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <motion.div
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 p-3.5 text-gray-900 font-semibold rounded-xl hover:bg-linear-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300 group"
                          >
                            {link.icon && (
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                                <link.icon className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <span className="group-hover:text-primary transition-colors duration-300">
                              {link.name}
                            </span>
                          </motion.div>
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Additional Links */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className="space-y-2 pt-6 border-t border-gray-200"
                >
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                    <span>More</span>
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                  </h3>
                  <Link
                    href="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="block p-3.5 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 font-medium"
                    >
                      My Orders
                    </motion.div>
                  </Link>
                  <Link href="/help" onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="block p-3.5 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 font-medium"
                    >
                      Help Center
                    </motion.div>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="block p-3.5 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 font-medium"
                    >
                      Become a Vendor
                    </motion.div>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
