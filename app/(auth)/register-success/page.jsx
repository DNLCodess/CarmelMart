"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Star,
  Shield,
  ArrowRight,
  ExternalLink,
  Mail,
  LogIn,
  Home,
} from "lucide-react";
import Button from "@/components/ui/button";
import Link from "next/link";

function VendorSuccessContent() {
  const searchParams = useSearchParams();

  /**
   * Extract verification type from URL parameters
   *
   * Expected URL format from Flutterwave redirect:
   * /register-success?registrationtype=nin_cac&status=completed&tx_ref=...
   *
   * The verificationType is passed as a key-value pair: registrationtype=nin or registrationtype=nin_cac
   */
  const verificationType = searchParams.get("registrationtype");

  // Determine tier and pricing based on verification type
  const isPremium = verificationType === "nin_cac";
  const vendorTier = isPremium ? "Premium" : "Standard";
  const amount = isPremium ? "₦10,000" : "₦5,000";

  // Telegram community link for vendor updates
  const telegramLink = process.env.TG_LINK;

  const benefits = isPremium
    ? [
        "Priority placement in search results",
        "Premium verification badge",
        "3x higher product visibility",
        "Dedicated vendor support",
        "Early access to new features",
        "Advanced analytics dashboard",
      ]
    : [
        "Verified vendor badge",
        "Unlimited product listings",
        "Access to marketplace tools",
        "Standard vendor support",
        "Monthly performance reports",
        "Seller dashboard access",
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with Success State */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6"
          >
            <CheckCircle2
              className="w-11 h-11 text-green-600"
              strokeWidth={2.5}
            />
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Payment Successful! 🎉
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your {vendorTier.toLowerCase()} vendor account is now active
            </p>

            {/* Tier Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200 shadow-sm"
            >
              {isPremium ? (
                <>
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Vendor Tier
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      Premium Vendor
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Vendor Tier
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      Standard Vendor
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-8"
        >
          {/* Transaction Details */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Amount Paid
                </div>
                <div className="text-2xl font-bold text-gray-900">{amount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Status
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  <span className="text-sm font-medium text-green-700">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Email Verification Required - Enhanced Design */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-linear-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-linear-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-600" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Verify Your Email Address
                </h3>
                <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                  <p>
                    We've sent a verification email to the address you provided
                    during registration. Please check your inbox and click the
                    verification link to activate your account.
                  </p>
                  <div className="flex items-start gap-2 pt-2 bg-white/60 rounded-lg p-3">
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5" />
                    <p className="font-semibold text-gray-900">
                      You must verify your email before attempting to log in
                    </p>
                  </div>
                  <p className="text-gray-600 text-xs pt-1">
                    Didn't receive the email? Check your spam folder or contact
                    support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Quick Actions - New Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Quick Actions
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Login Button */}
              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full group">
                  <LogIn className="w-5 h-5" />
                  Go to Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {/* Homepage Button */}
              <Link href="/">
                <Button variant="outline" size="lg" className="w-full group">
                  <Home className="w-5 h-5" />
                  Back to Homepage
                </Button>
              </Link>
            </div>
            <p className="text-xs text-center text-gray-500 mt-4">
              Remember to verify your email before logging in
            </p>
          </motion.section>

          {/* Primary CTA - Telegram */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-linear-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-2xl p-8 shadow-sm"
          >
            <div className="text-center max-w-xl mx-auto">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-3">
                Join the Vendor Community
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                The marketplace is currently in development. Join our Telegram
                community to receive launch updates, connect with other vendors,
                and get early access to platform features.
              </p>
              <Link href={telegramLink}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto group shadow-lg shadow-primary/30"
                >
                  Join Telegram Community
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </Link>
              <p className="text-sm text-gray-500 mt-4">
                You'll be notified when the platform launches
              </p>
            </div>
          </motion.section>

          {/* Benefits Overview */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Your {vendorTier} Benefits
              </h2>
              {isPremium && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Star className="w-3.5 h-3.5" fill="currentColor" />
                  Premium
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      isPremium ? "text-primary" : "text-green-600"
                    } flex-shrink-0 mt-0.5`}
                    strokeWidth={2}
                  />
                  <span className="text-gray-700 text-sm">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* What's Next */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              What Happens Next
            </h2>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Verify Your Email",
                  description:
                    "Check your inbox and click the verification link. This is required before you can log in to your account.",
                },
                {
                  step: 2,
                  title: "Join the Community",
                  description:
                    "Connect with fellow vendors and get real-time updates on platform development via Telegram.",
                },
                {
                  step: 3,
                  title: "Receive Launch Notification",
                  description:
                    "You'll be among the first to know when the marketplace goes live and ready for business.",
                },
                {
                  step: 4,
                  title: "Start Selling",
                  description:
                    "Upload your products and begin reaching thousands of customers across Nigeria.",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.3 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center text-sm font-bold shadow-sm">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {item.title}
                    </div>
                    <div className="text-gray-600 text-sm leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Support Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="text-center pt-4 pb-8"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-gray-600 text-sm">
                Questions? Email us at{" "}
                <a
                  href="mailto:support@carmelmart.com"
                  className="text-primary font-semibold hover:underline"
                >
                  support@carmelmart.com
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function VendorSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VendorSuccessContent />
    </Suspense>
  );
}
