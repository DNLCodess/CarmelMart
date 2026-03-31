"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ChevronUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { footerLinks, socialLinks } from "@/lib/data";

// === Payment Icons ===
const VisaIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto" fill="none">
    <rect width="48" height="32" rx="4" fill="#1A1F71" />
    <path
      d="M21.5 11.2L18.8 20.8H16.2L14.5 13.6C14.4 13.2 14.3 13 14 12.8C13.5 12.5 12.7 12.2 12 12V11.6H16.3C16.9 11.6 17.4 12 17.5 12.7L18.3 17.5L20.3 11.6H22.8L21.5 11.2ZM29.5 18.3C29.5 20.9 26.5 21.1 26.5 19.6C26.5 19 27 18.5 28.2 18.4C28.8 18.3 30.5 18.2 30.5 19.1V18.3H29.5ZM32 20.8H29.8C29.8 20.4 29.7 20 29.6 19.7C29.2 19.9 28.5 20.1 27.8 20.1C26.3 20.1 25.2 19.3 25.2 17.9C25.2 15.9 27.5 15.7 29.5 15.7V15.4C29.5 14.7 29 14.3 28.2 14.3C27.2 14.3 26.8 14.7 26.7 15.3H25C25.1 13.7 26.4 12.8 28.3 12.8C30.6 12.8 31.8 13.8 31.8 15.7V20.8H32Z"
      fill="white"
    />
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto" fill="none">
    <rect width="48" height="32" rx="4" fill="#000000" />
    <circle cx="18" cy="16" r="8" fill="#EB001B" />
    <circle cx="30" cy="16" r="8" fill="#F79E1B" />
    <path
      d="M24 9.6C22.4 10.9 21.3 12.8 21.3 15C21.3 17.2 22.4 19.1 24 20.4C25.6 19.1 26.7 17.2 26.7 15C26.7 12.8 25.6 10.9 24 9.6Z"
      fill="#FF5F00"
    />
  </svg>
);

const VerveIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto" fill="none">
    <rect width="48" height="32" rx="4" fill="#00425F" />
    <path
      d="M14 12L16.5 20H18L20.5 12H18.8L17.3 17.5L15.8 12H14ZM21 12L22.5 17.5L21 12ZM24.5 17.5C24.5 18.3 25.2 19 26 19H29V17.5H26.5V15.5H28.5V14H26.5V12H29V10.5H26C25.2 10.5 24.5 11.2 24.5 12V17.5ZM30 12V20H31.5V16H32.5L34 20H35.8L34.2 16C35 15.7 35.5 15 35.5 14C35.5 12.6 34.4 11.5 33 11.5H30V12Z"
      fill="white"
    />
  </svg>
);

// === Footer ===
export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="bg-primary text-gray-300">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-5 gap-6">
        {/* Brand */}
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="inline-block mb-2">
            <Image
              src="/logo-white.png"
              alt="CarmelMart"
              width={160}
              height={160}
              className="object-contain"
            />
          </Link>
          <p className="text-xs text-white leading-relaxed mb-3">
            Nigeria&apos;s trusted multi-vendor marketplace. Shop Smart, Live Better.
          </p>

          {/* Contact */}
          <div className="flex flex-col gap-1 text-xs text-white">
            <a href="tel:+2348076942904" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Phone className="w-3.5 h-3.5" /> +234 807 694 2904
            </a>
            <a href="mailto:support@carmelmart.ng" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Mail className="w-3.5 h-3.5" /> support@carmelmart.ng
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Lagos, Nigeria
            </span>
          </div>

          {/* Social */}
          <div className="flex gap-2 mt-3">
            {socialLinks.map((social, i) => (
              <motion.a
                key={i}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-800/70 flex items-center justify-center hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{social.icon}</span>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Link groups */}
        {["shop", "support", "company"].map((section, i) => (
          <div key={i}>
            <h4 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">
              {section}
            </h4>
            <ul className="space-y-1">
              {footerLinks[section].map((link, idx) => (
                <li key={idx}>
                  <Link href={link.href} className="text-xs text-white/80 hover:text-accent transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment + Bottom */}
      <div className="border-t border-white/10 py-4 px-4 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white">
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
          <span className="text-white/60">Secure Payments:</span>
          <VisaIcon />
          <MastercardIcon />
          <VerveIcon />
          <Image
            src="https://flutterwave.com/images/logo/full.svg"
            alt="Flutterwave"
            width={60}
            height={18}
            className="opacity-70"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-white/60">
          <Link href="/help" className="hover:text-accent transition-colors">Privacy</Link>
          <Link href="/help" className="hover:text-accent transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-accent transition-colors">Cookies</Link>
          <Link href="/help" className="hover:text-accent transition-colors">Sitemap</Link>
        </div>
        <p className="text-white/60 text-[11px] text-center">
          © {new Date().getFullYear()} CarmelMart. All rights reserved.
        </p>
      </div>

      {/* Scroll to Top */}
      <motion.button
        onClick={scrollToTop}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 w-10 h-10 bg-linear-to-br from-primary to-accent text-white rounded-full flex items-center justify-center shadow-lg z-40"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-4 h-4" />
      </motion.button>
    </footer>
  );
}
