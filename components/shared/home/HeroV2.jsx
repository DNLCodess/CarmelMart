"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star, Shield, BadgeCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

const slides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
    title: "Dress to",
    titleAccent: "Impress",
    description:
      "Shop the latest trends — African prints, sneakers, bags and more from verified Nigerian vendors.",
    ctaLabel: "Shop Fashion",
    ctaHref: "/shop?category=fashion",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&q=80",
    title: "Up to 40% Off",
    titleAccent: "Phones & Laptops",
    description:
      "Latest smartphones, laptops, earbuds and gadgets — all genuine, all delivered nationwide.",
    ctaLabel: "Shop Electronics",
    ctaHref: "/shop?category=electronics",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&q=80",
    title: "Make Your Space",
    titleAccent: "Feel Like Home",
    description:
      "Furniture, kitchen essentials, bedding and decor — everything to build your dream home.",
    ctaLabel: "Shop Home & Living",
    ctaHref: "/shop?category=home-living",
  },
];

const trustItems = [
  { icon: BadgeCheck, label: "KYC Verified" },
  { icon: Shield, label: "100% Buyer Protection" },
  { icon: Truck, label: "Nationwide Delivery" },
];

export default function HeroV2() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const { data: productsData } = useQuery({
    queryKey: ["hero-featured-products"],
    queryFn: () =>
      fetch("/api/products?featured=true&per_page=2").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const heroProducts = useMemo(() => {
    return (productsData?.products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.sale_price ?? p.price,
      rating: p.avg_rating ?? 0,
      badge: p.sale_price ? "Sale" : "Featured",
      image: Array.isArray(p.images) ? p.images[0] : null,
    }));
  }, [productsData]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      5000
    );
    return () => clearInterval(id);
  }, [autoPlay]);

  const goTo = (i) => {
    setCurrent(i);
    setAutoPlay(false);
  };

  const slide = slides[current];

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-primary-dark">

      {/* ── Full-bleed image with Ken Burns ──────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={`${slide.title} ${slide.titleAccent}`}
            fill
            className="object-cover object-center animate-ken-burns"
            priority={current === 0}
            placeholder="blur"
            blurDataURL={BLUR}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Overlays: minimal and targeted ───────────────────── */}
      {/* Darkens only bottom-left corner — just enough context for the card */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary-dark/65 via-primary-dark/10 to-transparent pointer-events-none" />
      {/* Thin bottom anchor so dots are readable */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-primary-dark/50 to-transparent pointer-events-none" />

      {/* ── Slide counter — top left ──────────────────────────── */}
      <div className="absolute top-8 left-8 lg:left-14 z-20 select-none">
        <span className="font-mono text-[11px] tracking-[0.22em] text-white/35">
          0{current + 1}&nbsp;&nbsp;/&nbsp;&nbsp;0{slides.length}
        </span>
      </div>

      {/* ── Content card ──────────────────────────────────────── */}
      {/*  Positioned bottom-left on all sizes; full-width on mobile, 42% on desktop */}
      <div className="absolute bottom-12 left-0 right-0 lg:right-auto z-10 px-6 sm:px-10 lg:px-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:w-[78%] lg:w-[42%] max-w-xl
                       bg-primary-dark/78 backdrop-blur-2xl
                       border border-white/10 rounded-3xl
                       p-7 lg:p-9"
          >
            {/* Headline */}
            <h1
              className="font-bold tracking-tight leading-[1.05] text-white mb-3"
              style={{ fontSize: "clamp(2.2rem, 4vw, 3.1rem)" }}
            >
              {slide.title}
              <br />
              <span className="text-accent-light">{slide.titleAccent}</span>
            </h1>

            {/* Description */}
            <p className="text-[14px] text-white/50 leading-relaxed mb-7 max-w-xs">
              {slide.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-row flex-wrap gap-3 mb-7">
              <Link href={slide.ctaHref}>
                <button className="inline-flex items-center gap-2 bg-white text-primary-dark font-semibold text-[13px] px-5 py-3 rounded-full hover:bg-white/90 active:scale-[0.98] transition-all">
                  {slide.ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
              <Link href="/register">
                <button className="inline-flex items-center border border-white/20 text-white/60 font-semibold text-[13px] px-5 py-3 rounded-full hover:border-white/35 hover:text-white/85 transition-all">
                  Start Selling
                </button>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-row flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 mb-5">
              {trustItems.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-accent flex-shrink-0" />
                  <span className="text-[11px] text-white/40 font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
              {slides.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
                >
                  <div
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      i === current
                        ? "w-7 bg-white"
                        : "w-3.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── DB featured product cards (desktop only) ─────────── */}
      {heroProducts.length >= 2 && (
        <div className="hidden lg:block absolute inset-0 z-10 pointer-events-none">

          {/* Primary card — upper right */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.55 }}
            className="animate-float absolute top-[18%] right-16 w-52 pointer-events-auto"
          >
            <Link href={`/product/${heroProducts[0].id}`} className="block group">
              <div className="relative h-60 rounded-2xl overflow-hidden shadow-2xl">
                {heroProducts[0].image && (
                  <Image
                    src={heroProducts[0].image}
                    alt={heroProducts[0].name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[10px] font-bold bg-accent text-white px-2.5 py-0.5 rounded-full">
                  {heroProducts[0].badge}
                </span>
                {heroProducts[0].rating > 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-white text-[11px] font-semibold">
                      {heroProducts[0].rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-b-2xl px-4 py-2.5">
                <p className="text-white font-semibold text-[13px] line-clamp-1">
                  {heroProducts[0].name}
                </p>
                <p className="text-accent-light font-bold text-[13px] mt-0.5">
                  ₦{heroProducts[0].price.toLocaleString()}
                </p>
              </div>
            </Link>
          </motion.div>

          {/* Secondary card — lower right */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.55 }}
            className="animate-float-reverse absolute bottom-24 right-80 w-44 pointer-events-auto"
          >
            <Link href={`/product/${heroProducts[1].id}`} className="block group">
              <div className="relative h-44 rounded-2xl overflow-hidden shadow-xl">
                {heroProducts[1].image && (
                  <Image
                    src={heroProducts[1].image}
                    alt={heroProducts[1].name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[10px] font-bold gradient-primary text-white px-2.5 py-0.5 rounded-full">
                  {heroProducts[1].badge}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-b-2xl px-3 py-2">
                <p className="text-white font-semibold text-xs line-clamp-1">
                  {heroProducts[1].name}
                </p>
                <p className="text-accent-light font-bold text-xs mt-0.5">
                  ₦{heroProducts[1].price.toLocaleString()}
                </p>
              </div>
            </Link>
          </motion.div>

        </div>
      )}

    </section>
  );
}
