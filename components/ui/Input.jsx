"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";

const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className = "",
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`space-y-2 ${containerClassName}`}
      >
        {label && (
          <label className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            className={`
            w-full px-4 py-3 rounded-xl border-2 transition-all duration-300
            ${Icon ? "pl-12" : ""}
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-gray-200 focus:border-[--color-primary] focus:ring-[--color-primary]/20"
            }
            focus:outline-none focus:ring-4
            placeholder:text-gray-400
            ${className}
          `}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-sm text-red-600 font-medium"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    );
  }
);

Input.displayName = "Input";

export default Input;
