"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CartPreview({ cartItems, cartCount, cartTotal, onEnter, onLeave }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="hidden md:block absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
    >
      {cartItems.length === 0 ? (
        <div className="p-6 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-1">Your cart is empty</p>
          <p className="text-xs text-gray-400 mb-4">Find something you love</p>
          <Link href="/shop">
            <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
              Start Shopping
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">My Cart</span>
            <span className="text-xs text-gray-400">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {cartItems.slice(0, 3).map((item) => (
              <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={44} height={44} className="object-cover w-full h-full" />
                  ) : (
                    <Package className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="text-xs font-bold text-primary shrink-0">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
            {cartItems.length > 3 && (
              <p className="px-4 py-2 text-xs text-gray-400 text-center">
                +{cartItems.length - 3} more item{cartItems.length - 3 !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">₦{cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Link href="/cart" className="flex-1">
                <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                  View Cart
                </button>
              </Link>
              <Link href="/checkout" className="flex-1">
                <button className="w-full bg-primary text-white py-2 rounded-xl text-xs font-semibold hover:bg-primary-dark transition-colors">
                  Checkout
                </button>
              </Link>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
