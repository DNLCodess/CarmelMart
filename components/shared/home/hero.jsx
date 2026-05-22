"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star, ChevronLeft, ChevronRight, Tag } from "lucide-react";
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
      "border-2 border-white text-white hover:bg-white hover:text-primary backdrop-blur-sm",
    white:
      "bg-white text-primary hover:bg-primary hover:text-white shadow-lg hover:shadow-xl backdrop-blur-sm",
  };
  const sizes = {
    lg: "px-8 py-4 text-base",
  };

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
      "Shop the latest trends in fashion — African prints, sneakers, bags and more from verified Nigerian vendors.",
    ctaLabel: "Shop Fashion",
    ctaHref: "/shop?category=fashion",
    stats: { vendors: "Verified", products: "Authentic", satisfaction: "100%" },
    statLabels: {
      vendors: "Vendors Only",
      products: "Products",
      satisfaction: "Buyer Protection",
    },
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
    stats: { vendors: "KYC", products: "7-Day", satisfaction: "Secure" },
    statLabels: {
      vendors: "Verified Sellers",
      products: "Easy Returns",
      satisfaction: "Checkout",
    },
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
    stats: { vendors: "Fast", products: "Nationwide", satisfaction: "Safe" },
    statLabels: {
      vendors: "Delivery",
      products: "Shipping",
      satisfaction: "Payments",
    },
  },
];


export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch DB banners — fall back to static slides if empty/unavailable
  const { data: bannerData } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: () => fetch("/api/banners").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

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

  const slides = useMemo(() => {
    const db = bannerData?.banners ?? [];
    if (db.length > 0) {
      return db.map((b) => ({
        id: b.id,
        image: b.image_url,
        badge: b.badge_text || "Featured",
        title: b.title,
        titleAccent: b.subtitle || "",
        description: b.description || "",
        ctaLabel: b.cta_label || "Shop Now",
        ctaHref: b.cta_href || "/shop",
        stats: {
          vendors: "Verified",
          products: "Authentic",
          satisfaction: "100%",
        },
        statLabels: {
          vendors: "Vendors Only",
          products: "Products",
          satisfaction: "Buyer Protection",
        },
      }));
    }
    return heroSlides.map((s) => ({
      ...s,
      ctaLabel: s.ctaLabel ?? "Shop Now",
      ctaHref: s.ctaHref ?? "/shop",
    }));
  }, [bannerData]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const currentHero =
    slides[Math.min(currentSlide, slides.length - 1)] ?? slides[0];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-primary-dark">
      {/* Animated Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={currentHero.image}
            alt={`${currentHero.title} ${currentHero.titleAccent}`}
            fill
            className="object-cover"
            priority={currentSlide === 0}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
          />
          {/* Gradient overlay — left side dark for text legibility, image shows through on right */}
          <div className="absolute inset-0 bg-linear-to-r from-primary-dark/95 via-primary-dark/80 to-primary-dark/30" />
          <div className="absolute inset-0 bg-linear-to-t from-primary-dark/90 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Ambient Glow */}
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/25 rounded-full blur-3xl animate-pulse" />

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full mb-8 border border-white/20"
              >
                <Tag className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-white">
                  {currentHero.badge}
                </span>
                <span className="text-xs text-white/60">
                  • Nigeria&apos;s Verified Marketplace
                </span>
              </motion.div>

              {/* Heading */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6">
                {currentHero.title}
                <br />
                <span className="gradient-text-hero">
                  {currentHero.titleAccent}
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
                {currentHero.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center sm:flex-row gap-4 mb-16">
                <Link href={currentHero.ctaHref} className="w-[75%] sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full">
                    {currentHero.ctaLabel}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/register" className="w-[75%] sm:w-auto">
                  <Button variant="white" size="lg" className="w-full">
                    Start Selling
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators with Glass Effect */}
              <div className="grid grid-cols-3 gap-2 sm:gap-6 p-4 sm:p-6 bg-primary/10 backdrop-blur-xl rounded-2xl border border-white/10">
                <div>
                  <div className="text-lg sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 leading-none">
                    {currentHero.stats.vendors}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    {currentHero.statLabels?.vendors ?? "Verified Vendors"}
                  </div>
                </div>
                <div className="border-x border-white/10 px-2 sm:px-0">
                  <div className="text-lg sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 leading-none">
                    {currentHero.stats.products}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    {currentHero.statLabels?.products ?? "Products"}
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-3xl font-bold text-white mb-0.5 sm:mb-1 leading-none">
                    {currentHero.stats.satisfaction}
                  </div>
                  <div className="text-[10px] sm:text-sm text-gray-400 leading-tight">
                    {currentHero.statLabels?.satisfaction ?? "Satisfaction"}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Featured Products Showcase */}
          {heroProducts.length >= 2 && (
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
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="inline-block gradient-accent px-3 py-1 rounded-full text-xs font-semibold mb-3 text-white">
                    {heroProducts[0].badge}
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {heroProducts[0].name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      ₦{heroProducts[0].price.toLocaleString()}
                    </span>
                    {heroProducts[0].rating > 0 && (
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
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
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="inline-block gradient-primary px-3 py-1 rounded-full text-xs font-semibold mb-2 text-white">
                    {heroProducts[1].badge}
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">
                    {heroProducts[1].name}
                  </h3>
                  <span className="text-xl font-bold">
                    ₦{heroProducts[1].price.toLocaleString()}
                  </span>
                </div>
              </Link>

              {/* Floating Stats Card */}
              <div className="animate-float-sm absolute top-1/2 left-0 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-5 w-52 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center shadow-lg">
                    <span className="text-2xl text-white">✓</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">100%</div>
                    <div className="text-xs text-gray-400">Buyer Protection</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Slide Indicators */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3"
        role="tablist"
        aria-label="Hero slides"
      >
        {slides.map((_, index) => (
          <button
            key={index}
            role="tab"
            onClick={() => goToSlide(index)}
            aria-selected={index === currentSlide}
            aria-current={index === currentSlide ? "true" : undefined}
            aria-label={`Go to slide ${index + 1}`}
            className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
          >
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-12 bg-white"
                  : "w-8 bg-white/40 hover:bg-white/60"
              }`}
            />
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .gradient-text-hero {
          background: linear-gradient(
            to right,
            var(--color-accent),
            var(--color-accent-light),
            var(--color-primary-light)
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  );
}
