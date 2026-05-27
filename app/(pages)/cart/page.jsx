"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const total = useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));

  const deliveryFee = items.length > 0 ? 1500 : 0; // shown as estimate; final fee set at checkout
  const grandTotal = total + deliveryFee;

  const handleRemove = (item) => {
    removeItem(item.productId);
    toast.success(`${item.name} removed from cart`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Looks like you haven't added anything yet. Explore our products!
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Start Shopping
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Shopping Cart
            <span className="ml-2 text-base font-normal text-gray-500">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </h1>
          <Link href="/shop" className="text-sm text-primary font-semibold hover:underline">
            Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Cart Items ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 flex gap-3 sm:gap-5"
                >
                  {/* Image */}
                  <Link href={`/product/${item.productId}`} className="shrink-0">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.productId}`}>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-primary">
                        {item.name}
                      </h3>
                    </Link>

                    <p className="text-lg font-bold text-gray-900 mb-3">
                      ₦{item.price.toLocaleString()}
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Quantity control */}
                      <div className="flex items-center border-2 border-gray-200 rounded-full overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-3 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-3 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemove(item)}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Order Summary ───────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Promo code */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Promo Code
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                />
                <button
                  onClick={() => toast("Apply promo codes at checkout for the most accurate total.")}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Order Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-medium text-gray-900">₦{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span className="font-medium text-gray-900">₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base text-gray-900">
                  <span>Total</span>
                  <span className="text-primary">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-primary to-primary-dark text-white font-semibold py-3.5 rounded-full hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </Link>

              {/* Trust */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Secured by Flutterwave
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
