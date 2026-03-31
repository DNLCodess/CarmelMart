"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const categories = [
  {
    name: "Fashion",
    slug: "fashion",
    count: "2,450+",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
    sub: ["Men's Wear", "Women's Wear", "Shoes", "Bags"],
  },
  {
    name: "Electronics",
    slug: "electronics",
    count: "1,890+",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    sub: ["Phones", "Laptops", "TVs", "Audio"],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    count: "3,200+",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    sub: ["Furniture", "Kitchen", "Bedding", "Decor"],
  },
  {
    name: "Beauty",
    slug: "beauty",
    count: "1,650+",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    sub: ["Skincare", "Makeup", "Hair", "Fragrances"],
  },
  {
    name: "Sports",
    slug: "sports",
    count: "980+",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    sub: ["Gym", "Sportswear", "Supplements", "Outdoor"],
  },
  {
    name: "Books",
    slug: "books",
    count: "2,100+",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    sub: ["Fiction", "Non-Fiction", "Academic", "Children's"],
  },
  {
    name: "Phones",
    slug: "phones",
    count: "890+",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
    sub: ["Smartphones", "Accessories", "Cases", "Chargers"],
  },
  {
    name: "Food & Drinks",
    slug: "food-drinks",
    count: "540+",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    sub: ["Snacks", "Beverages", "Organic", "Spices"],
  },
];

export default function CategoriesSection() {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <section className="py-16 sm:py-20 bg-linear-to-br from-gray-50 via-primary/2 to-accent/3 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Explore Categories
            </h2>
            <p className="text-gray-600">
              Find exactly what you&apos;re looking for
            </p>
          </motion.div>
          <Link
            href="/shop"
            className="hidden sm:flex items-center gap-1 text-primary text-sm font-semibold hover:gap-2 transition-all"
          >
            All categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Desktop: 4-col grid (2 rows) */}
        <div className="hidden sm:grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.4 }}
              viewport={{ once: true }}
              onMouseEnter={() => setActiveIdx(index)}
              onMouseLeave={() => setActiveIdx(null)}
              className="group cursor-pointer"
            >
              <Link href={`/shop?category=${cat.slug}`}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative h-40 lg:h-44 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300 ring-1 ring-gray-200 hover:ring-2 hover:ring-primary/40"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/75 transition-all duration-300" />

                  {/* Shine sweep */}
                  <motion.div
                    className="absolute inset-0 bg-linear-to-br from-white/0 via-white/15 to-white/0"
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: activeIdx === index ? "100%" : "-100%", opacity: activeIdx === index ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-end p-3 z-10">
                    <motion.div
                      className="text-center"
                      animate={{ scale: activeIdx === index ? 1.05 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-sm font-bold text-white drop-shadow-md">{cat.name}</h3>
                      <p className="text-[11px] text-white/80 font-medium mt-0.5">{cat.count}</p>
                    </motion.div>
                  </div>

                  {/* Bottom accent line */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-accent to-primary z-20"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: activeIdx === index ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>

                {/* Sub-categories tooltip on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: activeIdx === index ? 1 : 0, y: activeIdx === index ? 0 : 4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 space-y-0.5 pointer-events-none"
                >
                  {cat.sub.slice(0, 2).map((s) => (
                    <p key={s} className="text-[10px] text-gray-500 text-center truncate">{s}</p>
                  ))}
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="sm:hidden -mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
            {categories.map((cat, index) => (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="snap-start shrink-0 w-32"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  viewport={{ once: true }}
                  className="relative h-36 rounded-2xl overflow-hidden ring-1 ring-gray-200 shadow-sm active:scale-95 transition-transform"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-2.5">
                    <h3 className="text-xs font-bold text-white text-center leading-tight">{cat.name}</h3>
                    <p className="text-[10px] text-white/75 mt-0.5">{cat.count}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
          {/* scroll indicator dots */}
          <div className="flex justify-center gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 rounded-full bg-gray-300 ${i === 0 ? "w-4" : "w-1.5"}`} />
            ))}
          </div>
        </div>

        {/* Mobile "all categories" link */}
        <div className="text-center mt-6 sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            View all categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
