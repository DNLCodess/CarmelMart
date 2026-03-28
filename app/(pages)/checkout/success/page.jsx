"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, ShoppingBag, Home, Package } from "lucide-react";
import Link from "next/link";

// useSearchParams must live inside a Suspense boundary
function SuccessContent() {
  const searchParams = useSearchParams();
  const isPOD    = searchParams.get("pod")      === "1";
  const orderId  = searchParams.get("order_id") ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-xl p-10 max-w-md w-full text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-green-500" />
      </motion.div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isPOD ? "Order Placed!" : "Payment Successful!"}
      </h1>

      <p className="text-gray-600 mb-6">
        {isPOD
          ? "Your Pay on Delivery order has been confirmed. Our vendor will contact you before delivery."
          : "Your payment was received and your order is being processed."}
      </p>

      {isPOD && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <p className="font-semibold mb-1">Reminder</p>
          <p>Please have the remaining balance ready when your order arrives. Keep your phone reachable.</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-5 mb-8 space-y-2 text-sm text-left">
        <div className="flex items-center gap-2 text-gray-700">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <span>A confirmation email has been sent to you</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
          <span>Track your order anytime from My Orders</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={orderId ? `/orders/${orderId}` : "/orders"}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <ShoppingBag className="w-4 h-4" />
          Track Order
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-400 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </motion.div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse" />
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
