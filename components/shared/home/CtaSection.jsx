"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { TrendingUp, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/button";

export default function CtaSection() {
  const ctaRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: ctaRef, offset: ["start end", "end start"] });

  const backgroundY    = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY       = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 0.9, 0.85]);
  const contentScale   = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={ctaRef} className="relative py-32 overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: backgroundY, willChange: "transform" }}>
        <div className="absolute inset-0 scale-110">
          <Image
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=80"
            alt="Shopping"
            fill
            className="object-cover"
            priority
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-accent"
        style={{ opacity: overlayOpacity, willChange: "opacity" }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
        style={{ y: contentY, scale: contentScale, opacity: contentOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Nigeria's #1 Marketplace</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Start Your Shopping
            <br />
            <span className="bg-gradient-to-r from-accent-light to-white bg-clip-text text-transparent">
              Journey Today
            </span>
          </h2>

          <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers and verified vendors on Nigeria&apos;s most trusted marketplace
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register">
                <Button variant="white" size="lg" className="w-full sm:w-auto text-primary hover:bg-gray-50 shadow-xl">
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/shop">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm">
                  Browse Products
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="grid grid-cols-3 gap-6 md:gap-8 pt-12 border-t border-white/20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {[
              { value: "850+",  label: "Verified Vendors"   },
              { value: "12.5K", label: "Products Available" },
              { value: "45K+",  label: "Happy Customers"    },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                whileHover={{ scale: 1.05 }}
                className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 border border-white/10"
              >
                <div className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-br from-white to-accent-light bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm opacity-80">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
    </section>
  );
}
