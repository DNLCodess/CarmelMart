"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  const baseStyles =
    "font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/25 text-white active:scale-[0.98]",
    accent:
      "bg-gradient-to-r from-accent to-accent-dark hover:shadow-lg hover:shadow-accent/25 text-white active:scale-[0.98]",
    outline:
      "border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white active:scale-[0.98]",
    ghost: "text-gray-700 hover:bg-gray-100 active:scale-[0.98]",
    white:
      "bg-white text-gray-900 hover:bg-gray-50 shadow-sm active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-5 py-2 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-base",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
