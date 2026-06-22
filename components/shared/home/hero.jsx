"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Star,
  Shield,
  Package,
  BadgeCheck,
  Truck,
  RotateCcw,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Button = ({
  children,
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "gradient-primary text-white hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5",
    outline:
      "border-2 border-white/70 text-white hover:bg-white hover:text-primary backdrop-blur-sm",
    white:
      "bg-white/10 backdrop-blur-sm border border-white/25 text-white hover:bg-white hover:text-primary transition-all",
  };
  const sizes = { lg: "px-7 py-3.5 text-sm" };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const heroSlides = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
    badge: "Fashion Week",
    title: "Dress to",
    titleAccent: "Impress",
    description:
      "Shop the latest trends — African prints, sneakers, bags and more from verified Nigerian vendors.",
    ctaLabel: "Shop Fashion",
    ctaHref: "/shop?category=fashion",
    stats: [
      { value: "500+", label: "Verified Vendors", icon: BadgeCheck },
      { value: "10K+", label: "Products Listed", icon: Package },
      { value: "100%", label: "Buyer Protection", icon: Shield },
    ],
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&q=80",
    badge: "Electronics Sale",
    title: "Up to 40% Off",
    titleAccent: "Phones & Laptops",
    description:
      "Latest smartphones, laptops, earbuds and gadgets — all genuine, all delivered nationwide.",
    ctaLabel: "Shop Electronics",
    ctaHref: "/shop?category=electronics",
    stats: [
      { value: "KYC", label: "Verified Sellers", icon: BadgeCheck },
      { value: "7-Day", label: "Easy Returns", icon: RotateCcw },
      { value: "Secure", label: "Checkout", icon: Lock },
    ],
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&q=80",
    badge: "Home & Living",
    title: "Make Your Space",
    titleAccent: "Feel Like Home",
    description:
      "Furniture, kitchen essentials, bedding and decor — find everything to build your dream home.",
    ctaLabel: "Shop Home & Living",
    ctaHref: "/shop?category=home-living",
    stats: [
      { value: "Fast", label: "Delivery", icon: Truck },
      { value: "Nigeria-wide", label: "Shipping", icon: Package },
      { value: "Safe", label: "Payments", icon: Shield },
    ],
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
    if (!isAutoPlaying) return;
    const interval = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length),
      5000
    );
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index) => { setCurrentSlide(index); setIsAutoPlaying(false); };

  const currentHero = heroSlides[currentSlide] ?? heroSlides[0];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-primary-dark">

      {/* ── Background image ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={currentHero.image}
            alt={`${currentHero.title} ${currentHero.titleAccent}`}
            fill
            className="object-cover object-center"
            priority={currentSlide === 0}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
          />
          {/* Single gradient: dark on left for text, fades out right so image shows */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/88 via-primary-dark/55 to-primary-dark/10" />
          {/* Subtle bottom fade for the trust bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              {/* Heading */}
              <h1 className="text-[clamp(2.8rem,6vw,4.5rem)] font-bold text-white leading-[1.06] tracking-tight mb-5">
                {currentHero.title}
                <br />
                <span className="hero-accent-text">{currentHero.titleAccent}</span>
              </h1>

              {/* Description */}
              <p className="text-[15px] text-white/65 mb-9 leading-relaxed max-w-md">
                {currentHero.description}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 w-full sm:w-auto">
                <Link href={currentHero.ctaHref} className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    {currentHero.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="white" size="lg" className="w-full sm:w-auto">
                    Start Selling
                  </Button>
                </Link>
              </div>

              {/* Trust bar */}
              <div className="flex items-stretch divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm">
                {currentHero.stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="flex-1 px-4 py-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        <span className="text-[13px] sm:text-base font-bold text-white leading-none">
                          {stat.value}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/45 leading-tight">
                        {stat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right — featured products OR platform trust cards */}
          {heroProducts.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block relative h-[600px]"
            >
              {/* Main Product Card */}
              <Link
                href={`/product/${heroProducts[0].id}`}
                className="animate-float absolute top-0 right-0 w-80 h-96 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-500 group"
              >
                {heroProducts[0].image && (
                  <Image
                    src={heroProducts[0].image}
                    alt={heroProducts[0].name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <span className="inline-block gradient-accent px-3 py-1 rounded-full text-xs font-semibold mb-3">
                    {heroProducts[0].badge}
                  </span>
                  <h3 className="text-xl font-bold mb-2">{heroProducts[0].name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      ₦{heroProducts[0].price.toLocaleString()}
                    </span>
                    {heroProducts[0].rating > 0 && (
                      <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">
                          {heroProducts[0].rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {/* Secondary Product Card */}
              <Link
                href={`/product/${heroProducts[1].id}`}
                className="animate-float-reverse absolute bottom-0 left-0 w-64 h-80 rounded-3xl overflow-hidden shadow-xl backdrop-blur-sm border border-white/10 transform -rotate-6 hover:rotate-0 transition-transform duration-500 group"
              >
                {heroProducts[1].image && (
                  <Image
                    src={heroProducts[1].image}
                    alt={heroProducts[1].name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <span className="inline-block gradient-primary px-3 py-1 rounded-full text-xs font-semibold mb-2">
                    {heroProducts[1].badge}
                  </span>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">
                    {heroProducts[1].name}
                  </h3>
                  <span className="text-xl font-bold">
                    ₦{heroProducts[1].price.toLocaleString()}
                  </span>
                </div>
              </Link>

              {/* Floating protection badge */}
              <div className="animate-float-sm absolute top-1/2 left-0 bg-black/30 backdrop-blur-xl rounded-2xl p-4 w-48 border border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white leading-none">100%</div>
                    <div className="text-[11px] text-white/50 mt-0.5">Buyer Protection</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Fallback bento when no featured products */
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:flex flex-col gap-3 h-[460px]"
            >
              {/* Large top card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex-1 bg-black/25 backdrop-blur-md rounded-3xl border border-white/10 p-7 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-2xl gradient-accent flex items-center justify-center mb-5">
                    <BadgeCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">500+</div>
                  <div className="text-sm text-white/50">KYC Verified Vendors</div>
                </div>
                <p className="text-white/55 text-sm leading-relaxed relative z-10">
                  Every seller is identity-verified and approved before listing products on Carmel Mart.
                </p>
              </motion.div>

              {/* Two smaller cards */}
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 p-5"
                >
                  <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center mb-4">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-0.5">100%</div>
                  <div className="text-[11px] text-white/45 leading-tight">Buyer Protection</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52 }}
                  className="bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 p-5"
                >
                  <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center mb-4">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-0.5">Fast</div>
                  <div className="text-[11px] text-white/45 leading-tight">Nationwide Delivery</div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Slide indicators ─────────────────────────────────── */}
      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5"
        role="tablist"
        aria-label="Hero slides"
      >
        {heroSlides.map((_, index) => (
          <button
            key={index}
            role="tab"
            onClick={() => goToSlide(index)}
            aria-selected={index === currentSlide}
            aria-label={`Go to slide ${index + 1}`}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
          >
            <div
              className={`h-[3px] rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-4 bg-white/25 hover:bg-white/40"
              }`}
            />
          </button>
        ))}
      </div>

      <style jsx>{`
        .hero-accent-text {
          color: var(--color-accent-light);
        }
      `}</style>
    </section>
  );
}
