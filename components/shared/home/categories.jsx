"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

export default function CategoriesSection() {
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = [
    {
      name: "Fashion",
      count: 2450,
      image:
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
    },
    {
      name: "Electronics",
      count: 1890,
      image:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Home & Living",
      count: 3200,
      image:
        "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Beauty",
      count: 1650,
      image:
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Sports",
      count: 980,
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Books",
      count: 2100,
      image:
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <section className="py-20 bg-linear-to-br from-gray-50 via-primary/[0.02] to-accent/[0.03] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/5 to-transparent rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">
              Explore Categories
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Find exactly what you&apos;re looking for from our curated
              collections
            </p>
          </motion.div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
              onMouseEnter={() => setActiveCategory(index)}
              onMouseLeave={() => setActiveCategory(null)}
              className="group cursor-pointer"
            >
              <Link
                href={`/category/${category.name
                  .toLowerCase()
                  .replace(/ /g, "-")}`}
              >
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative h-48 md:h-52 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 ring-1 ring-gray-200 hover:ring-2 hover:ring-primary/50"
                >
                  {/* Image using regular img tag */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-[500px] h-[500px]"
                    loading="lazy"
                  />

                  {/* Dark overlay for text readability only */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/70 transition-all duration-500"></div>

                  {/* Shine Effect on Hover */}
                  <motion.div
                    className="absolute inset-0 bg-linear-to-br from-white/0 via-white/20 to-white/0"
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{
                      x: activeCategory === index ? "100%" : "-100%",
                      opacity: activeCategory === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 z-10">
                    <motion.div
                      className="text-center"
                      animate={{
                        scale: activeCategory === index ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-lg md:text-xl font-bold mb-1 text-center drop-shadow-lg">
                        {category.name}
                      </h3>
                      <p className="text-sm opacity-95 drop-shadow-md font-medium">
                        {category.count.toLocaleString()} Items
                      </p>
                    </motion.div>

                    {/* Hover Arrow Indicator */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: activeCategory === index ? 1 : 0,
                        y: activeCategory === index ? 0 : 10,
                      }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-4 flex items-center gap-1 text-sm font-semibold"
                    >
                      <span>Explore</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Bottom accent line - brand presence */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary z-20 shadow-lg"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: activeCategory === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/categories">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 ring-2 ring-primary/10 hover:ring-primary/30"
            >
              View All Categories
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
