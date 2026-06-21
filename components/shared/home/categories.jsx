"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/lib/useCategories";

const CATEGORY_META = {
  // ── canonical slugs ───────────────────────────────────────────────────────
  consumables: {
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    sub: "Food, drinks & essentials",
  },
  apparels: {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
    sub: "Clothing, shoes & accessories",
  },
  "home-living": {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    sub: "Furniture, decor & kitchen",
  },
  "electronics-tools": {
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    sub: "Gadgets, tools & appliances",
  },
  "leisure-lifestyle": {
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    sub: "Sports, hobbies & wellness",
  },
  // ── common slug variants (in case DB slugs differ) ────────────────────────
  electronics: {
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    sub: "Gadgets, tools & appliances",
  },
  technology: {
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    sub: "Gadgets, tools & appliances",
  },
  clothing: {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
    sub: "Clothing, shoes & accessories",
  },
  fashion: {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
    sub: "Clothing, shoes & accessories",
  },
  apparel: {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
    sub: "Clothing, shoes & accessories",
  },
  food: {
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    sub: "Food, drinks & essentials",
  },
  grocery: {
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    sub: "Food, drinks & essentials",
  },
  home: {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    sub: "Furniture, decor & kitchen",
  },
  furniture: {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    sub: "Furniture, decor & kitchen",
  },
  sports: {
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    sub: "Sports, hobbies & wellness",
  },
  fitness: {
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    sub: "Sports, hobbies & wellness",
  },
  health: {
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
    sub: "Health, beauty & personal care",
  },
  beauty: {
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    sub: "Skincare, makeup & grooming",
  },
  "baby-kids": {
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
    sub: "Toys, clothing & essentials",
  },
  toys: {
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
    sub: "Toys & kids' essentials",
  },
  automotive: {
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
    sub: "Car accessories & parts",
  },
  books: {
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80",
    sub: "Books, stationery & education",
  },
};

// Diverse fallback pool — used for any category whose slug isn't in CATEGORY_META
// Each position maps to a visually distinct image so no two unmatched categories look alike.
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80", // shopping bags
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80", // market stalls
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80", // products
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", // shoes
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80", // friends shopping
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80", // store interior
];

const FALLBACK_CATEGORIES = Object.entries(CATEGORY_META).slice(0, 6).map(([slug, meta]) => ({
  name: slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
  slug,
  productCount: null,
  ...meta,
}));

export default function CategoriesSection() {
  const { parents, isLoading } = useCategories();

  const categories = parents.length
    ? parents.slice(0, 6).map((category, i) => ({
        ...category,
        image: category.image
          ?? CATEGORY_META[category.slug]?.image
          ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
        sub: CATEGORY_META[category.slug]?.sub ?? category.description ?? "Shop verified products",
      }))
    : isLoading ? [] : FALLBACK_CATEGORIES;

  return (
    <section className="py-14 lg:py-16 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-950">Shop by category</h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600">Start with the departments people buy from most.</p>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/shop?category=${category.slug}`}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width:1024px) 50vw, 16vw"
                />
              </div>
              <div className="p-3.5">
                <h3 className="text-sm font-bold text-gray-950 line-clamp-1">{category.name}</h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-1">{category.sub}</p>
                {category.productCount != null && (
                  <p className="mt-2 text-xs font-semibold text-primary">{category.productCount.toLocaleString()} items</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 sm:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            View all categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
