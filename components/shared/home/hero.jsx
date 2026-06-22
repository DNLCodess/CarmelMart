"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

// Parent categories sourced from DB (parent_id IS NULL). Stored locally — these don't change.
// Slugs are the canonical DB values; note "liesure-lifestyle" is the DB slug (typo preserved).
const categories = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Fashion & Style",
    href: "/shop?category=fashion-style",
    image:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&q=85",
    headline: "Dress to",
    headlineAccent: "Impress",
    description:
      "Clothing, shoes, bags and accessories — from verified Nigerian fashion vendors.",
    cta: "Shop Fashion",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Electronics",
    href: "/shop?category=electronics",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&q=85",
    headline: "Phones, Laptops",
    headlineAccent: "& More",
    description:
      "Latest gadgets, TVs and accessories — genuine products, delivered nationwide.",
    cta: "Shop Electronics",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Home & Living",
    href: "/shop?category=home-living",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&q=85",
    headline: "Your Home,",
    headlineAccent: "Your Style",
    description:
      "Furniture, kitchen essentials and decor — everything to transform your space.",
    cta: "Shop Home & Living",
  },
  {
    id: "10000000-0000-0000-0000-000000000008",
    name: "Consumables",
    href: "/shop?category=consumables",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=85",
    headline: "Fresh Stock,",
    headlineAccent: "Every Day",
    description:
      "Groceries, beverages and pantry essentials — from local and national brands.",
    cta: "Shop Groceries",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "Leisure & Lifestyle",
    href: "/shop?category=liesure-lifestyle",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1400&q=85",
    headline: "Play Hard,",
    headlineAccent: "Live Better",
    description:
      "Sports gear, outdoor equipment and wellness products for every lifestyle.",
    cta: "Explore Leisure",
  },
  {
    id: "4d81e4a4-bb77-4655-9396-066449dc62e8",
    name: "Automotive & Tools",
    href: "/shop?category=automotive-tools",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1400&q=85",
    headline: "Tools for",
    headlineAccent: "Every Job",
    description:
      "Car parts, power tools and accessories from trusted vendors nationwide.",
    cta: "Shop Automotive",
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % categories.length),
      5000,
    );
    return () => clearInterval(id);
  }, [autoPlay]);

  const activate = (i) => {
    setCurrent(i);
    setAutoPlay(false);
  };

  const cat = categories[current];

  return (
    <section className="relative w-full flex flex-col bg-primary-dark overflow-hidden min-h-[58vh] sm:min-h-[92vh]">
      {/* ── Full-bleed background image ─────────────────────────────── */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover object-center"
              priority={current === 0}
              placeholder="blur"
              blurDataURL={BLUR}
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-linear-to-tr from-primary-dark/90 via-primary-dark/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-primary-dark/80 to-transparent" />
      </div>

      {/* ── Hero text ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-12 lg:px-16 pb-7 sm:pb-10 lg:pb-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Category label */}
            <p className="text-accent text-[20px] font-bold uppercase tracking-[0.28em] mb-2.5 sm:mb-4">
              {cat.name}
            </p>

            <h1
              className="font-bold text-white mb-3 sm:mb-5"
              style={{
                fontSize: "clamp(2rem, 5.5vw, 5.5rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
              }}
            >
              {cat.headline}
              <br />
              <span className="text-accent-light">{cat.headlineAccent}</span>
            </h1>

            <p className="text-[14px] sm:text-[15px] text-white/65 leading-relaxed mb-5 sm:mb-9 max-w-[340px]">
              {cat.description}
            </p>

            <Link href={cat.href}>
              <button className="inline-flex items-center gap-2 bg-white text-primary-dark font-bold text-[12px] sm:text-[13px] px-5 sm:px-7 py-3 sm:py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors duration-200 active:scale-[0.98] tracking-wide">
                {cat.cta}
                <ArrowRight className="w-3.5 h-3.5 sm:w-[15px] sm:h-[15px]" />
              </button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Category strip ───────────────────────────────────────────── */}
      <div
        className="relative z-10 bg-primary-dark/92 backdrop-blur-xl border-t border-white/[0.07]"
        onMouseLeave={() => setAutoPlay(true)}
      >
        {/* Desktop: equal-width strip — fixed height so all cells align regardless of name length */}
        <div className="hidden sm:flex divide-x divide-white/6">
          {categories.map((c, i) => {
            const isActive = i === current;
            return (
              <button
                key={c.id}
                onClick={() => activate(i)}
                onMouseEnter={() => activate(i)}
                className={`flex-1 relative flex flex-col items-center justify-center gap-2.5 px-2 transition-all duration-300 cursor-pointer h-[98px] ${
                  isActive ? "bg-white/6" : "hover:bg-white/4"
                }`}
              >
                {/* Active top bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-[2.5px] bg-accent transition-opacity duration-300 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* Thumbnail */}
                <div
                  className={`relative w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0 transition-all duration-300 ${
                    isActive
                      ? "ring-2 ring-accent/60 ring-offset-2 ring-offset-primary-dark scale-[1.06]"
                      : "opacity-55 grayscale-40"
                  }`}
                >
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR}
                  />
                </div>

                {/* Name — fixed 2-line height so all cells are the same regardless of wrapping */}
                <span
                  className={`text-[10px] font-bold text-center tracking-wide transition-colors duration-300 leading-[1.3] line-clamp-2 px-1 w-full h-[2.6em] flex items-center justify-center ${
                    isActive ? "text-white" : "text-white/45"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile: scrollable strip */}
        <div className="sm:hidden flex overflow-x-auto [&::-webkit-scrollbar]:hidden px-4 gap-1">
          {categories.map((c, i) => {
            const isActive = i === current;
            return (
              <button
                key={c.id}
                onClick={() => activate(i)}
                className={`relative flex flex-col items-center gap-2 py-3 px-3 shrink-0 transition-all duration-300 rounded-xl ${
                  isActive ? "bg-white/8" : ""
                }`}
              >
                <div
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all duration-300 ${
                    isActive ? "ring-2 ring-accent/50" : "opacity-55"
                  }`}
                >
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-tight transition-colors duration-300 ${
                    isActive ? "text-white" : "text-white/40"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
