"use client";

import { motion } from "framer-motion";
import { BadgeCheck, LogOut } from "lucide-react";
import Link from "next/link";

export default function AccountDropdown({
  onEnter, onLeave,
  isAuthenticated,
  initials, displayName, displayRole, firstName,
  accountLinks,
  onSignOut, onClose,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
    >
      {isAuthenticated ? (
        <>
          <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-gray-500 capitalize">{displayRole}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            {accountLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3">Sign in for the best experience</p>
          <Link href="/login" onClick={onClose}>
            <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/register" onClick={onClose}>
            <button className="w-full border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
              Create Account
            </button>
          </Link>
          <div className="pt-2 border-t border-gray-100 text-center">
            <Link href="/register?as=vendor" onClick={onClose}>
              <span className="text-xs text-primary hover:underline font-medium">
                Sell on CarmelMart →
              </span>
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
