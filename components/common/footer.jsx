"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  Send,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/button";
import { footerLinks, socialLinks } from "@/lib/data";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setIsSubscribing(true);
    // Add your newsletter subscription logic here
    setTimeout(() => {
      setIsSubscribing(false);
      setEmail("");
      alert("Thanks for subscribing!");
    }, 1000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-900 text-gray-300 relative">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Stay in the Loop
              </h3>
              <p className="text-gray-400">
                Subscribe to get special offers, free giveaways, and exclusive
                deals.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-800 border border-gray-700 focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20 outline-none text-white placeholder:text-gray-500 transition-all"
                />
              </div>
              <Button
                type="submit"
                variant="accent"
                size="lg"
                isLoading={isSubscribing}
                className="px-8"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>{" "}
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative w-44 h-44">
                <Image
                  src="/logo-white.png"
                  alt="CarmelMart"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-6 text-gray-400">
              Nigeria&apos;s premier multi-vendor e-commerce platform connecting
              verified sellers with customers nationwide. Shop Smart Live Better
            </p>{" "}
            {/* Contact Info */}
            <div className="space-y-3">
              {" "}
              <a
                href="tel:+2341234567890"
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[--color-primary] transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <span>+2348076942904</span>
              </a>
              <a
                href="mailto:support@carmelmart.ng"
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[--color-primary] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <span>support@carmelmart.ng</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Lagos, Nigeria</span>
              </div>
            </div>{" "}
            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[--color-primary] flex items-center justify-center transition-all duration-300"
                  aria-label={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>{" "}
          {/* Shop Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
              Shop
            </h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>{" "}
          {/* Support Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>{" "}
          {/* Company Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>{" "}
          {/* Vendors Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
              For Vendors
            </h4>
            <ul className="space-y-3">
              {footerLinks.vendors.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>{" "}
        {/* Payment Methods */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Secure Payment Methods
              </p>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-xs font-semibold text-white">
                  VISA
                </div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-xs font-semibold text-white">
                  MASTERCARD
                </div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-xs font-semibold text-white">
                  VERVE
                </div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg">
                  <Image
                    src="https://paystack.com/assets/img/logo/logo-mark-blue.svg"
                    alt="Paystack"
                    width={60}
                    height={20}
                    className="opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>{" "}
      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2025 CarmelMart. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/cookies"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
              <Link
                href="/sitemap"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>{" "}
      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-[--color-primary] to-[--color-accent] text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-all"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6" />
      </motion.button>
    </footer>
  );
}
