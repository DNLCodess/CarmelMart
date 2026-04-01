"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";

export default function WishlistPage() {
  const wishlist = useUIStore((s) => s.wishlist);
  const removeFromWishlist = useUIStore((s) => s.removeFromWishlist);
  const addItem = useCartStore((s) => s.addItem);

  // wishlist stores full product objects; guard against stale ID-only entries
  const products = wishlist.filter((w) => w?.id);

  const handleMoveToCart = (product) => {
    const price = product.salePrice ?? product.price;
    addItem({ productId: product.id, vendorId: product.vendor?.id ?? null, name: product.name, price, image: product.image, quantity: 1 });
    removeFromWishlist(product.id);
    toast.success(`${product.name} moved to cart`);
  };

  const handleRemove = (product) => {
    removeFromWishlist(product.id);
    toast.success("Removed from wishlist");
  };

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8">Save items you love and come back to them anytime.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity">
            Discover Products <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Wishlist <span className="text-base font-normal text-gray-500">({products.length} items)</span>
          </h1>
          <Link href="/shop" className="text-sm text-primary font-semibold hover:underline">Continue Shopping</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {products.map((product) => (
              <motion.div
                key={product.id}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow duration-300"
              >
                <Link href={`/product/${product.id}`}>
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    {product.badge && (
                      <div className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-full">{product.badge}</div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{product.vendor?.name ?? product.vendor}</p>
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-primary">{product.name}</h3>
                  </Link>
                  <div className="mb-3">
                    <span className="text-lg font-bold text-gray-900">₦{(product.salePrice ?? product.price).toLocaleString()}</span>
                    {product.salePrice && <span className="text-xs text-gray-400 line-through ml-1.5">₦{product.price.toLocaleString()}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToCart(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                    <button
                      onClick={() => handleRemove(product)}
                      className="p-2.5 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
