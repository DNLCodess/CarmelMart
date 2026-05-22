"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

function TestimonialCard({ t, colorClass }) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {t.avatarUrl ? (
            <Image
              src={t.avatarUrl}
              alt={t.name}
              width={44}
              height={44}
              className="w-11 h-11 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-2xl ${colorClass} flex items-center justify-center text-sm font-bold shrink-0`}
            >
              {initials(t.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900">{t.name}</p>
            <p className="text-xs text-gray-500">{t.location}</p>
          </div>
        </div>
        <Quote className="w-8 h-8 text-primary/20 shrink-0" />
      </div>
      <Stars count={t.rating} />
      <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-4">
        &ldquo;{t.text}&rdquo;
      </p>
      {t.product && (
        <div className="pt-3 border-t border-gray-50">
          <p className="text-xs text-primary font-semibold truncate">
            {t.product}
          </p>
        </div>
      )}
    </>
  );
}

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () =>
      fetch("/api/reviews/testimonials").then((r) => r.json()),
    staleTime: 10 * 60 * 1000,
  });

  const testimonials = data?.reviews ?? [];

  if (!isLoading && testimonials.length === 0) return null;

  const total = testimonials.length;
  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const visible = total >= 3
    ? [
        testimonials[current % total],
        testimonials[(current + 1) % total],
        testimonials[(current + 2) % total],
      ]
    : testimonials;

  if (isLoading) {
    return (
      <section className="py-16 sm:py-24 bg-linear-to-br from-primary/5 via-white to-accent/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden sm:grid grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-gray-100 p-6 h-52 animate-pulse"
              >
                <div className="flex gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-200" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-200 rounded" />
                  <div className="h-2.5 bg-gray-200 rounded w-5/6" />
                  <div className="h-2.5 bg-gray-200 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

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
            Real reviews from verified buyers across Nigeria
          </p>
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
                <TestimonialCard
                  t={t}
                  colorClass={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                />
              </motion.div>
            ))}
          </div>

          {total > 3 && (
            <>
              <button
                onClick={prev}
                className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:border-primary transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={next}
                className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:border-primary transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}
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
              <TestimonialCard
                t={testimonials[current]}
                colorClass={AVATAR_COLORS[current % AVATAR_COLORS.length]}
              />
            </motion.div>
          </AnimatePresence>

          {total > 1 && (
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={prev}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-gray-300"}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
