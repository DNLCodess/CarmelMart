"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

const categories = [
  {
    id: 1,
    name: "Fashion",
    href: "/shop?category=fashion",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&q=85",
    headline: "Dress to",
    headlineAccent: "Impress",
    description: "African prints, sneakers, bags and more — from verified Nigerian fashion vendors.",
    cta: "Shop Fashion",
  },
  {
    id: 2,
    name: "Electronics",
    href: "/shop?category=electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&q=85",
    headline: "Up to 40% Off",
    headlineAccent: "Phones & Laptops",
    description: "Latest smartphones, laptops and gadgets — genuine products, delivered nationwide.",
    cta: "Shop Electronics",
  },
  {
    id: 3,
    name: "Home & Living",
    href: "/shop?category=home-living",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&q=85",
    headline: "Make Your Space",
    headlineAccent: "Feel Like Home",
    description: "Furniture, kitchen essentials and decor — everything to build your dream home.",
    cta: "Shop Home",
  },
  {
    id: 4,
    name: "Beauty & Health",
    href: "/shop?category=beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=85",
    headline: "Look & Feel",
    headlineAccent: "Your Best",
    description: "Skincare, makeup and wellness products from brands you can trust.",
    cta: "Shop Beauty",
  },
  {
    id: 5,
    name: "Food & Drinks",
    href: "/shop?category=food",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=85",
    headline: "Fresh & Fast,",
    headlineAccent: "Right to You",
    description: "Groceries, local produce and your favourite brands — delivered daily.",
    cta: "Shop Groceries",
  },
  {
    id: 6,
    name: "Sports & Fitness",
    href: "/shop?category=sports",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=85",
    headline: "Train Hard,",
    headlineAccent: "Live Better",
    description: "Gym equipment, sportswear and fitness gear for every level.",
    cta: "Shop Sports",
  },
];

export default function HeroDesignA() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % categories.length), 5000);
    return () => clearInterval(id);
  }, [autoPlay]);

  const activate = (i) => { setCurrent(i); setAutoPlay(false); };
  const cat = categories[current];

  return (
    <section
      className="relative w-full bg-primary-dark overflow-hidden flex flex-col"
      style={{ minHeight: "92vh" }}
      onMouseLeave={() => setAutoPlay(true)}
    >
      {/* ── Full-bleed category image ─── */}
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
      </div>

      {/* ── Left panel — solid brand color, diagonal right edge ─── */}
      {/* clip-path slants the right edge: top-right at 100%, bottom-right at 82%  */}
      {/* creating a forward-slash "/" diagonal that exposes more image on the right */}
      <div
        className="absolute top-0 left-0 z-10 bg-primary-dark flex flex-col justify-center px-12 lg:px-16"
        style={{
          width: "55%",
          bottom: "76px",
          clipPath: "polygon(0 0, 100% 0, 82% 100%, 0 100%)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-accent text-[11px] font-bold uppercase tracking-[0.22em] mb-5">
              {cat.name}
            </p>
            <h1
              className="font-bold tracking-tight leading-none text-white mb-6"
              style={{ fontSize: "clamp(3.4rem, 5.6vw, 6.2rem)" }}
            >
              {cat.headline}
              <br />
              <span className="text-accent-light">{cat.headlineAccent}</span>
            </h1>
            <p className="text-[15px] text-white/50 leading-relaxed mb-10 max-w-[340px]">
              {cat.description}
            </p>
            <Link href={cat.href}>
              <button className="inline-flex items-center gap-2 bg-white text-primary-dark font-semibold text-[13px] px-7 py-4 rounded-full hover:bg-accent hover:text-white transition-colors duration-200 active:scale-[0.98]">
                {cat.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Spacer pushes strip to the bottom ─── */}
      <div className="flex-1" />

      {/* ── Category strip — text-only, no thumbnails ─── */}
      <div className="relative z-10 h-[76px] bg-primary-dark border-t border-white/[0.07] flex items-stretch divide-x divide-white/[0.06]">
        {categories.map((c, i) => {
          const isActive = i === current;
          return (
            <button
              key={c.id}
              onClick={() => activate(i)}
              onMouseEnter={() => activate(i)}
              className={`flex-1 relative flex items-center justify-center transition-all duration-300 ${
                isActive ? "bg-white/6" : "hover:bg-white/[0.03]"
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-[2.5px] bg-accent transition-opacity duration-300 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`text-[12px] font-bold tracking-tight transition-colors duration-300 ${
                  isActive ? "text-white" : "text-white/35"
                }`}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
