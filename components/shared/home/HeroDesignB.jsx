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

export default function HeroDesignB() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % categories.length), 5000);
    return () => clearInterval(id);
  }, [autoPlay]);

  const activate = (i) => { setCurrent(i); setAutoPlay(false); };

  const cat = categories[current];
  const prevIdx = (current - 1 + categories.length) % categories.length;
  const nextIdx = (current + 1) % categories.length;
  const prev = categories[prevIdx];
  const next = categories[nextIdx];

  return (
    <section
      className="relative w-full bg-primary-dark overflow-hidden flex flex-col items-center justify-center"
      style={{ minHeight: "92vh" }}
      onMouseLeave={() => setAutoPlay(true)}
    >
      {/* Subtle radial ambient glow behind the cards */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 60%, rgba(86,2,56,0.6) 0%, #3d0127 100%)",
        }}
      />

      {/* ── Three-card gallery ─── */}
      <div className="relative z-10 flex items-end justify-center gap-4 w-full px-6">

        {/* Left side card — previous category */}
        <motion.button
          key={`left-${prevIdx}`}
          onClick={() => activate(prevIdx)}
          onMouseEnter={() => activate(prevIdx)}
          className="relative shrink-0 rounded-2xl overflow-hidden cursor-pointer"
          style={{ width: 248, height: 448 }}
          animate={{ opacity: 0.48, filter: "saturate(0.25)" }}
          whileHover={{ opacity: 0.72, filter: "saturate(0.65)" }}
          transition={{ duration: 0.3 }}
        >
          <Image src={prev.image} alt={prev.name} fill className="object-cover" placeholder="blur" blurDataURL={BLUR} />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-white text-[12px] font-bold tracking-tight">
            {prev.name}
          </p>
        </motion.button>

        {/* Center featured card — active category */}
        <div
          className="relative shrink-0 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
          style={{ width: 500, height: 580 }}
        >
          {/* Image crossfade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover"
                priority={current === 0}
                placeholder="blur"
                blurDataURL={BLUR}
              />
            </motion.div>
          </AnimatePresence>

          {/* Bottom info panel — frosted glass */}
          <div className="absolute bottom-0 left-0 right-0 bg-primary-dark/80 backdrop-blur-xl border-t border-white/10 px-7 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-accent text-[10px] font-bold uppercase tracking-[0.22em] mb-2">
                  {cat.name}
                </p>
                <h2
                  className="font-bold tracking-tight leading-none text-white mb-2"
                  style={{ fontSize: "clamp(1.9rem, 2.4vw, 2.6rem)" }}
                >
                  {cat.headline}{" "}
                  <span className="text-accent-light">{cat.headlineAccent}</span>
                </h2>
                <p className="text-[13px] text-white/45 leading-relaxed mb-5 line-clamp-1">
                  {cat.description}
                </p>
                <Link href={cat.href}>
                  <button className="inline-flex items-center gap-2 bg-white text-primary-dark font-semibold text-[13px] px-6 py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors duration-200 active:scale-[0.98]">
                    {cat.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right side card — next category */}
        <motion.button
          key={`right-${nextIdx}`}
          onClick={() => activate(nextIdx)}
          onMouseEnter={() => activate(nextIdx)}
          className="relative shrink-0 rounded-2xl overflow-hidden cursor-pointer"
          style={{ width: 248, height: 448 }}
          animate={{ opacity: 0.48, filter: "saturate(0.25)" }}
          whileHover={{ opacity: 0.72, filter: "saturate(0.65)" }}
          transition={{ duration: 0.3 }}
        >
          <Image src={next.image} alt={next.name} fill className="object-cover" placeholder="blur" blurDataURL={BLUR} />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-white text-[12px] font-bold tracking-tight">
            {next.name}
          </p>
        </motion.button>
      </div>

      {/* ── Dot navigation ─── */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-8">
        {categories.map((_, i) => (
          <button
            key={i}
            onClick={() => activate(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-[6px] bg-accent"
                : "w-[6px] h-[6px] bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
