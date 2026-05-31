"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Wallet,
  ArrowRight,
  Store,
  Users,
  BadgeCheck,
  Check,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const WHATSAPP_GROUP = "https://chat.whatsapp.com/BoKY0NNh9zHKhmt5kudZO7";

const HOW_IT_WORKS = [
  {
    icon: Package,
    title: "List your products",
    desc: "Upload photos, write a description, set your price. Takes under 2 minutes per item.",
    color: "bg-blue-50 text-blue-600",
    num: "1",
  },
  {
    icon: ShoppingCart,
    title: "Customer places an order",
    desc: "You get notified instantly. Confirm the order and hand it off to a rider for delivery.",
    color: "bg-amber-50 text-amber-600",
    num: "2",
  },
  {
    icon: Wallet,
    title: "Money lands in your wallet",
    desc: "Once delivery is confirmed, your payout is credited automatically. Withdraw anytime.",
    color: "bg-green-50 text-green-600",
    num: "3",
  },
];

const FIRST_MOVES = [
  {
    icon: Package,
    label: "Add your first product",
    desc: "Start earning as soon as you list",
    href: "/vendor/products/new",
    cta: "Add product",
  },
  {
    icon: Store,
    label: "Set up your store profile",
    desc: "A complete profile builds trust",
    href: "/vendor/settings",
    cta: "Edit profile",
  },
  {
    icon: Users,
    label: "Invite friends, earn ₦500 each",
    desc: "Your referral link is ready to share",
    href: "/vendor/referrals",
    cta: "Get link",
  },
];

export default function VendorWelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaving, setLeaving] = useState(false);

  const markWelcomed = () => {
    if (user?.id) {
      localStorage.setItem(`cm_vendor_welcomed_${user.id}`, "1");
    }
  };

  const handleGetStarted = () => {
    markWelcomed();
    setLeaving(true);
    router.push("/vendor/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero */}
      <div
        className="px-4 py-10 sm:py-14 text-center text-white"
        style={{ background: "linear-gradient(135deg, #560238 0%, #8b0356 100%)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto"
        >
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <BadgeCheck className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            You&apos;re approved! Welcome to CarmelMart.
          </h1>
          <p className="text-white/75 text-sm sm:text-base leading-relaxed">
            Your store is live. Here&apos;s everything you need to know to start making money today.
          </p>
        </motion.div>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-8 mt-8">

        {/* How you make money */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-gray-900">How you make money</h2>
          </div>
          <div className="space-y-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc, color, num }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.15 }}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
                <span className="text-3xl font-black text-gray-100 shrink-0 leading-none mt-0.5">
                  {num}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick facts */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-primary/5 border border-primary/15 rounded-2xl p-5"
        >
          <h2 className="text-sm font-bold text-gray-900 mb-3">Good to know</h2>
          <div className="space-y-2.5">
            {[
              "CarmelMart handles payments — you never touch cash from online orders.",
              "Your wallet balance updates after each confirmed delivery.",
              "Withdraw to your bank account anytime, minimum ₦500.",
              "Our team is here on WhatsApp if you ever need help — join our vendor group.",
            ].map((fact) => (
              <div key={fact} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-xs text-gray-700 leading-relaxed">{fact}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* WhatsApp community */}
        <motion.a
          href={WHATSAPP_GROUP}
          target="_blank"
          rel="noopener noreferrer"
          onClick={markWelcomed}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4 hover:bg-green-100 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900 text-sm">Join our vendor WhatsApp group</p>
            <p className="text-xs text-green-700 mt-0.5">Get tips, updates, and support from the team and fellow vendors.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-green-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </motion.a>

        {/* First moves */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">Your first 3 moves</h2>
          <div className="space-y-2.5">
            {FIRST_MOVES.map(({ icon: Icon, label, desc, href, cta }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.5 }}
              >
                <Link
                  href={href}
                  onClick={markWelcomed}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary group-hover:underline shrink-0">
                    {cta} →
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={handleGetStarted}
            disabled={leaving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base text-white transition-colors disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #560238 0%, #8b0356 100%)" }}
          >
            {leaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Go to my dashboard
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            You can come back to this guide anytime from{" "}
            <Link href="/vendor/welcome" onClick={markWelcomed} className="text-primary hover:underline">
              vendor settings
            </Link>
            .
          </p>
        </motion.div>

      </div>
    </div>
  );
}
