"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PROMO_MESSAGES } from "./navbar.data";

export default function PromoStrip({ promoIndex, onDismiss }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-primary-dark text-white text-xs sm:text-sm overflow-hidden"
    >
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center">
        <div className="flex-1 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={promoIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-2 font-medium"
            >
              <span>{PROMO_MESSAGES[promoIndex].icon}</span>
              <span>{PROMO_MESSAGES[promoIndex].text}</span>
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          onClick={onDismiss}
          className="ml-3 p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
