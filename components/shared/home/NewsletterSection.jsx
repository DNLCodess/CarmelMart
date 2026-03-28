"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function NewsletterSection() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success("You're subscribed! Check your inbox for deals.");
    setEmail("");
    setLoading(false);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Get Exclusive Deals &amp; Updates
          </h3>
          <p className="text-gray-600 mb-8">
            Subscribe to our newsletter and never miss out on special offers
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-6 py-3 rounded-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              required
            />
            <Button variant="primary" size="lg" type="submit" disabled={loading} className="sm:px-8">
              {loading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-4">We respect your privacy. Unsubscribe at any time.</p>
        </motion.div>
      </div>
    </section>
  );
}
