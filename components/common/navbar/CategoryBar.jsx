"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_SUBS } from "./navbar.data";

export default function CategoryBar({ activeCategory, setActiveCategory }) {
  const [hoveredCategory, setHovered] = useState(null);
  const megaMenuTimer = useRef(null);

  const clearHoverTimer = () => clearTimeout(megaMenuTimer.current);
  const scheduleHide    = () => { megaMenuTimer.current = setTimeout(() => setHovered(null), 150); };

  return (
    <div
      className="relative bg-primary border-t border-white/10"
      onMouseLeave={scheduleHide}
    >
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex items-center h-10">
            {CATEGORIES.map((cat) => {
              const Icon       = cat.icon;
              const isActive   = activeCategory === cat.name;
              const isAllDepts = cat.name === "All Departments";
              const hasSubs    = !!CATEGORY_SUBS[cat.name];
              return (
                <div
                  key={cat.name}
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
        {hoveredCategory && CATEGORY_SUBS[hoveredCategory] && (
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
                  {CATEGORY_SUBS[hoveredCategory].subs.map((sub) => (
                    <Link
                      key={sub}
                      href={`${CATEGORY_SUBS[hoveredCategory].href}&sub=${encodeURIComponent(sub.toLowerCase())}`}
                      onClick={() => setHovered(null)}
                      className="px-3 py-2 text-sm text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors font-medium whitespace-nowrap"
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
                <Link
                  href={CATEGORY_SUBS[hoveredCategory].href}
                  onClick={() => setHovered(null)}
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
  );
}
