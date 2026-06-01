"use client";

import { motion } from "framer-motion";
import { Search, ShoppingCart, CreditCard, Package, Shield, Star } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    step: "01",
    icon: Search,
    title: "Browse & Discover",
    description: "Search thousands of products from 850+ verified Nigerian vendors. Filter by category, price, rating, and location.",
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
  },
  {
    step: "02",
    icon: ShoppingCart,
    title: "Add to Cart",
    description: "Pick your items from multiple vendors — we bundle them into one seamless checkout. No juggling multiple orders.",
    color: "bg-purple-50 text-purple-600",
    border: "border-purple-100",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Pay Securely",
    description: "Pay securely with card, bank transfer, or USSD. Protected by Flutterwave and our 100% buyer guarantee.",
    color: "bg-green-50 text-green-600",
    border: "border-green-100",
  },
  {
    step: "04",
    icon: Package,
    title: "Fast Delivery",
    description: "Your order is delivered nationwide. Track in real-time from checkout to your doorstep across all 36 states.",
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
  },
];

const TRUST_POINTS = [
  { icon: Shield, label: "Buyer Protection", desc: "Every purchase is covered" },
  { icon: Star,   label: "Verified Vendors", desc: "All sellers KYC-verified"  },
  { icon: Package, label: "Easy Returns",    desc: "7-day no-questions return"  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4 tracking-wider uppercase">
            Simple & Secure
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            How CarmelMart Works
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Shop from hundreds of Nigerian vendors in one place — safely, conveniently, and with full buyer protection.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-linear-to-r from-blue-200 via-purple-200 to-orange-200 z-0" />

          {STEPS.map(({ step, icon: Icon, title, description, color, border }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative z-10 text-center"
            >
              <div className={`w-20 h-20 rounded-2xl ${color} border-2 ${border} flex items-center justify-center mx-auto mb-5 shadow-sm relative`}>
                <Icon className="w-8 h-8" />
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gray-50 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            {TRUST_POINTS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/register"
            className="shrink-0 px-6 py-3 bg-primary text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Start Shopping Free
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
