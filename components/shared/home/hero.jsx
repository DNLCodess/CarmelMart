"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

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
      "gradient-primary text-white hover:shadow-xl hover:shadow-[--color-primary]/40 hover:-translate-y-0.5",
    outline:
      "border-2 border-white text-white hover:bg-white hover:text-[--color-primary] backdrop-blur-sm",
    white:
      "bg-accent 5text-[--color-primary] hover:bg-white shadow-lg hover:shadow-xl backdrop-blur-sm",
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
    badge: "New Arrivals",
    title: "Shop Smart,",
    titleAccent: "Shop Verified",
    description:
      "Discover authentic products from Nigeria's most trusted vendors. Quality guaranteed, delivered nationwide.",
    stats: { vendors: "850+", products: "12K+", satisfaction: "98%" },
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80",
    badge: "Premium Collection",
    title: "Luxury Meets",
    titleAccent: "Affordability",
    description:
      "Experience premium quality without breaking the bank. Curated selections from top-rated vendors.",
    stats: { vendors: "850+", products: "12K+", satisfaction: "98%" },
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1920&q=80",
    badge: "Trending Now",
    title: "Your Style,",
    titleAccent: "Your Choice",
    description:
      "From fashion to electronics, find everything you need in one trusted marketplace.",
    stats: { vendors: "850+", products: "12K+", satisfaction: "98%" },
  },
];

const featuredProducts = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 45000,
    rating: 4.8,
    badge: "Bestseller",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  },
  {
    id: 2,
    name: "Designer Leather Bag",
    price: 35000,
    rating: 4.9,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
    );
    setIsAutoPlaying(false);
  };

  const currentHero = heroSlides[currentSlide];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
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
            alt="Hero Background"
            fill
            className="object-cover"
            priority
          />
          {/* Multi-layer Gradient Overlay for Perfect Text Visibility */}
          <div className="absolute inset-0 bg-linear-to-r from-slate-900/95 via-slate-900/85 to-slate-900/70" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-linear-to-b from-slate-900/40 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Ambient Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[--color-primary]/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[--color-accent]/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
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
                <Sparkles className="w-4 h-4 text-[--color-accent]" />
                <span className="text-sm font-semibold text-white">
                  {currentHero.badge}
                </span>
                <span className="text-xs text-white/60">
                  • Trusted by 45,000+ Shoppers
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
                <Button
                  variant="primary"
                  size="lg"
                  className=" w-[75%] md:w-full  sm:w-auto"
                >
                  Explore Products
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="white"
                  size="lg"
                  className="w-[75%] md:w-full sm:w-auto"
                >
                  Browse Vendors
                </Button>
              </div>

              {/* Trust Indicators with Glass Effect */}
              <div className="grid grid-cols-3 gap-6 p-6 bg-primary backdrop-blur-xl rounded-2xl border border-white/10">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {currentHero.stats.vendors}
                  </div>
                  <div className="text-sm text-gray-400">Verified Vendors</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {currentHero.stats.products}
                  </div>
                  <div className="text-sm text-gray-400">Products</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {currentHero.stats.satisfaction}
                  </div>
                  <div className="text-sm text-gray-400">Satisfaction</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Featured Products Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block relative h-[600px]"
          >
            {/* Main Product Card */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-80 h-96 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-500 group"
            >
              <Image
                src={featuredProducts[0].image}
                alt={featuredProducts[0].name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="inline-block gradient-accent px-3 py-1 rounded-full text-xs font-semibold mb-3 text-white">
                  {featuredProducts[0].badge}
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {featuredProducts[0].name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    ₦{featuredProducts[0].price.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">
                      {featuredProducts[0].rating}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Secondary Product Card */}
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="absolute bottom-0 left-0 w-64 h-80 rounded-3xl overflow-hidden shadow-xl backdrop-blur-sm border border-white/10 transform -rotate-6 hover:rotate-0 transition-transform duration-500 group"
            >
              <Image
                src={featuredProducts[1].image}
                alt={featuredProducts[1].name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="inline-block gradient-primary px-3 py-1 rounded-full text-xs font-semibold mb-2 text-white">
                  {featuredProducts[1].badge}
                </div>
                <h3 className="text-lg font-bold mb-2 line-clamp-2">
                  {featuredProducts[1].name}
                </h3>
                <span className="text-xl font-bold">
                  ₦{featuredProducts[1].price.toLocaleString()}
                </span>
              </div>
            </motion.div>

            {/* Floating Stats Card */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-0 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-5 w-52 border border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center shadow-lg">
                  <span className="text-2xl text-white">✓</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">45K+</div>
                  <div className="text-xs text-gray-400">Happy Customers</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="group relative"
            aria-label={`Go to slide ${index + 1}`}
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
