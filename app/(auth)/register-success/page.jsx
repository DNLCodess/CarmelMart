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
} from "lucide-react";
import Button from "@/components/ui/button";

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
  const verificationType = searchParams.get("registrationtype") || "nin";

  // Determine tier and pricing based on verification type
  const isPremium = verificationType === "nin_cac";
  const vendorTier = isPremium ? "Premium" : "Standard";
  const amount = isPremium ? "₦10,000" : "₦5,000";

  // Telegram community link for vendor updates
  const telegramLink = "https://t.me/+dummyvendorgroup";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header with Success State */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6"
          >
            <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2} />
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Payment Successful
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your {vendorTier.toLowerCase()} vendor account is now active
            </p>

            {/* Tier Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200">
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
            </div>
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
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Primary CTA - Telegram */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="text-center max-w-xl mx-auto">
              <div className="text-2xl font-bold text-gray-900 mb-3">
                Join the Vendor Community
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                The marketplace is currently in development. Join our Telegram
                community to receive launch updates, connect with other vendors,
                and get early access to platform features.
              </p>
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto group"
                >
                  Join Telegram Community
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </a>
              <p className="text-sm text-gray-500 mt-4">
                You'll be notified when the platform launches
              </p>
            </div>
          </section>

          {/* Benefits Overview */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Your {vendorTier} Benefits
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                    strokeWidth={2}
                  />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </section>

          {/* What's Next */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              What Happens Next
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">
                    Join the Community
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    Connect with fellow vendors and get real-time updates on
                    platform development
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">
                    Receive Launch Notification
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    You'll be among the first to know when the marketplace goes
                    live
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">
                    Start Selling
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    Upload your products and begin reaching thousands of
                    customers
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Support Footer */}
          <div className="text-center pt-4 pb-8">
            <p className="text-gray-600 text-sm">
              Questions? Email us at{" "}
              <a
                href="mailto:support@marketplace.com"
                className="text-primary font-medium hover:underline"
              >
                support@marketplace.com
              </a>
            </p>
          </div>
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
