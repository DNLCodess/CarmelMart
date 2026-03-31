"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap, Truck, Shield } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    title: "Electronics Week",
    subtitle: "Up to 40% off phones, laptops & more",
    cta: "Shop Electronics",
    href: "/shop?category=electronics",
    bg: "from-blue-600 to-indigo-700",
    accent: "bg-blue-500/30",
    icon: Zap,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80",
  },
  {
    id: 2,
    title: "Free Delivery",
    subtitle: "On all orders above ₦10,000 nationwide",
    cta: "Start Shopping",
    href: "/shop",
    bg: "from-green-600 to-emerald-700",
    accent: "bg-green-500/30",
    icon: Truck,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80",
  },
  {
    id: 3,
    title: "100% Buyer Protection",
    subtitle: "Shop with confidence — full refund guarantee",
    cta: "Learn More",
    href: "/help",
    bg: "from-purple-600 to-pink-700",
    accent: "bg-purple-500/30",
    icon: Shield,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
  },
];

export default function PromoBannersSection() {
  return (
    <section className="py-8 sm:py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BANNERS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={b.href}>
                  <div className={`relative bg-linear-to-br ${b.bg} rounded-2xl overflow-hidden h-36 sm:h-40 flex items-center px-6 group hover:shadow-xl transition-all duration-300`}>
                    {/* Background image */}
                    <img
                      src={b.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                      aria-hidden="true"
                    />
                    {/* Accent circle */}
                    <div className={`absolute -right-6 -top-6 w-32 h-32 ${b.accent} rounded-full blur-2xl`} />
                    <div className={`absolute -right-2 -bottom-4 w-24 h-24 ${b.accent} rounded-full`} />

                    <div className="relative z-10 flex-1">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-white font-extrabold text-lg leading-tight mb-1">{b.title}</h3>
                      <p className="text-white/80 text-sm mb-3">{b.subtitle}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full">
                        {b.cta} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
