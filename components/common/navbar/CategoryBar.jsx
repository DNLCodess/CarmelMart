"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, LayoutGrid, Zap, Tag } from "lucide-react";
import Link from "next/link";

// Map known category slugs to icons so the bar looks rich
import {
  ShoppingBag, Shirt, Home as HomeIcon, Wrench, Music,
} from "lucide-react";

const SLUG_ICON = {
  consumables:          ShoppingBag,
  apparels:             Shirt,
  "home-living":        HomeIcon,
  "electronics-tools":  Wrench,
  "leisure-lifestyle":  Music,
};

// categories  = parent category objects from DB  { id, name, slug, parent_id, ... }
// subsByParent = { [parentId]: [sub, sub, ...] }
export default function CategoryBar({ categories = [], subsByParent = {}, activeCategory, setActiveCategory }) {
  const [hoveredCategory, setHovered] = useState(null);
  const megaMenuTimer = useRef(null);

  const clearHoverTimer = () => clearTimeout(megaMenuTimer.current);
  const scheduleHide    = () => { megaMenuTimer.current = setTimeout(() => setHovered(null), 150); };

  const allDepts = { name: "All Departments", href: "/shop", icon: LayoutGrid, slug: "_all" };
  const flashSale = { name: "Flash Sale", href: "/shop?sort=flash_sale", icon: Zap, slug: "_flash", hot: true };

  const navItems = [
    allDepts,
    ...categories.map((c) => ({
      name: c.name,
      href: `/shop?category=${c.slug}`,
      icon: SLUG_ICON[c.slug] ?? Tag,
      slug: c.slug,
      id:   c.id,
    })),
    flashSale,
  ];

  return (
    <div
      className="relative bg-primary border-t border-white/10"
      onMouseLeave={scheduleHide}
    >
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex items-center h-10">
            {navItems.map((cat) => {
              const Icon        = cat.icon;
              const isActive    = activeCategory === cat.name;
              const isAllDepts  = cat.slug === "_all";
              const subs        = cat.id ? (subsByParent[cat.id] ?? []) : [];
              const hasSubs     = subs.length > 0;

              return (
                <div
                  key={cat.slug}
                  className="relative h-full shrink-0 flex items-center"
                  onMouseEnter={() => {
                    clearHoverTimer();
                    setHovered(hasSubs ? cat.name : null);
                  }}
                >
                  <Link
                    href={cat.href}
                    onClick={() => { setActiveCategory(cat.name); setHovered(null); }}
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

      {/* Mega menu */}
      <AnimatePresence>
        {hoveredCategory && (() => {
          const item = navItems.find((c) => c.name === hoveredCategory);
          const subs = item?.id ? (subsByParent[item.id] ?? []) : [];
          if (!subs.length) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="hidden md:block absolute left-0 right-0 top-full bg-white shadow-2xl border-t-2 border-accent z-50"
              onMouseEnter={clearHoverTimer}
              onMouseLeave={scheduleHide}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                <div className="flex items-start gap-8">
                  <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {subs.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/shop?category=${item.slug}&sub=${encodeURIComponent(sub.slug)}`}
                        onClick={() => setHovered(null)}
                        className="px-3 py-2 text-sm text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors font-medium whitespace-nowrap"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={item.href}
                    onClick={() => setHovered(null)}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full transition-colors whitespace-nowrap"
                  >
                    Browse all {hoveredCategory} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
