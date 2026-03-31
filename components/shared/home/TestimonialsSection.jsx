"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    id: 1,
    name: "Adaeze Okonkwo",
    location: "Lagos Island",
    avatar: "AO",
    color: "bg-purple-100 text-purple-700",
    rating: 5,
    text: "I ordered a skincare bundle from Beauty Haven and it arrived the next day — fully packaged, genuine products. CarmelMart is now my go-to for everything beauty. The vendors here are very legit.",
    product: "Organic Skincare Collection",
    date: "2 weeks ago",
  },
  {
    id: 2,
    name: "Emeka Chukwu",
    location: "Abuja, FCT",
    avatar: "EC",
    color: "bg-blue-100 text-blue-700",
    rating: 5,
    text: "Bought a gaming laptop from TechZone Nigeria. Price was unbeatable compared to other platforms, and the seller was very responsive. Delivery took 2 days to Abuja — faster than I expected!",
    product: "Gaming Laptop Pro",
    date: "1 month ago",
  },
  {
    id: 3,
    name: "Fatima Abdullahi",
    location: "Kano",
    avatar: "FA",
    color: "bg-green-100 text-green-700",
    rating: 5,
    text: "The Pay on Delivery option was a lifesaver. I was skeptical at first, but when my African print dresses arrived perfectly packaged, I paid without hesitation. Will definitely order again.",
    product: "African Print Dresses (x3)",
    date: "3 weeks ago",
  },
  {
    id: 4,
    name: "Tunde Bakare",
    location: "Port Harcourt",
    avatar: "TB",
    color: "bg-orange-100 text-orange-700",
    rating: 5,
    text: "Best Nigerian marketplace I've used. The seller verification gives me confidence. I bought gym equipment and it's exactly as described — no fake pictures, real quality. 100% recommend.",
    product: "Home Gym Equipment Set",
    date: "1 week ago",
  },
  {
    id: 5,
    name: "Chidinma Eze",
    location: "Enugu",
    avatar: "CE",
    color: "bg-pink-100 text-pink-700",
    rating: 5,
    text: "The flash sale got me a noise-cancelling headphone for 40% off! Couldn't believe it. Even the return process when I had a size issue was smooth — refund was back in 3 days. Excellent platform.",
    product: "Premium Headphones",
    date: "5 days ago",
  },
];

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const total = TESTIMONIALS.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  // Show 3 visible on desktop, 1 on mobile
  const visible = [
    TESTIMONIALS[(current) % total],
    TESTIMONIALS[(current + 1) % total],
    TESTIMONIALS[(current + 2) % total],
  ];

  return (
    <section className="py-16 sm:py-24 bg-linear-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4 tracking-wider uppercase">
            Real Customers
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            What Nigerians Are Saying
          </h2>
          <p className="text-gray-600">
            45,000+ happy customers across all 36 states
          </p>
        </motion.div>

        {/* Rating summary */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 sm:gap-12 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {[
            { value: "4.9/5", label: "Average Rating", sub: "From 12,400+ reviews" },
            { value: "98%",   label: "Satisfaction Rate", sub: "Verified purchases" },
            { value: "45K+",  label: "Happy Customers", sub: "Nationwide" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">{value}</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Desktop: 3-column carousel */}
        <div className="hidden sm:block relative">
          <div className="grid grid-cols-3 gap-5">
            {visible.map((t, i) => (
              <motion.div
                key={`${t.id}-${current}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow ${i === 1 ? "ring-2 ring-primary/20" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl ${t.color} flex items-center justify-center text-sm font-bold shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.location}</p>
                    </div>
                  </div>
                  <Quote className="w-8 h-8 text-primary/20 shrink-0" />
                </div>
                <Stars count={t.rating} />
                <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-4">"{t.text}"</p>
                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-xs text-primary font-semibold truncate">{t.product}</p>
                  <p className="text-xs text-gray-400 shrink-0 ml-2">{t.date}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Nav arrows */}
          <button onClick={prev} className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:border-primary transition-colors z-10">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={next} className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:border-primary transition-colors z-10">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Mobile: single card */}
        <div className="sm:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm"
            >
              {(() => {
                const t = TESTIMONIALS[current];
                return (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl ${t.color} flex items-center justify-center text-sm font-bold`}>
                          {t.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.location}</p>
                        </div>
                      </div>
                      <Quote className="w-7 h-7 text-primary/20" />
                    </div>
                    <Stars count={t.rating} />
                    <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-4">"{t.text}"</p>
                    <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                      <p className="text-xs text-primary font-semibold truncate">{t.product}</p>
                      <p className="text-xs text-gray-400 shrink-0 ml-2">{t.date}</p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Dots + arrows */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button onClick={prev} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-gray-300"}`} />
              ))}
            </div>
            <button onClick={next} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
