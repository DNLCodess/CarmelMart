"use client";

import { motion } from "framer-motion";

export default function Card({
  children,
  className = "",
  hover = true,
  gradient = false,
  ...props
}) {
  const baseStyles = "rounded-2xl backdrop-blur-sm border border-white/20";
  const gradientStyles = gradient
    ? "bg-linear-to-br from-white/90 to-white/70"
    : "bg-white/80";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 20px 40px rgba(86, 2, 56, 0.15)",
            }
          : {}
      }
      className={`${baseStyles} ${gradientStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
