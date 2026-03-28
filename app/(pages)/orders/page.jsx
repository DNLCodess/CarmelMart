"use client";

import { ShoppingBag, Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

// Mock orders — replace with React Query + Supabase when orders table is live
const MOCK_ORDERS = [
  { id: "CM-2024-00142", date: "2024-12-15", status: "delivered", total: 45000, items: 2, product: "Premium Noise-Cancelling Headphones" },
  { id: "CM-2024-00138", date: "2024-12-10", status: "shipped",   total: 18500, items: 1, product: "Elegant African Print Dress" },
  { id: "CM-2024-00131", date: "2024-12-02", status: "processing",total: 32000, items: 3, product: "Smart Fitness Tracker Watch" },
  { id: "CM-2024-00120", date: "2024-11-20", status: "cancelled", total: 25000, items: 1, product: "Organic Skincare Collection" },
];

const STATUS_MAP = {
  pending:    { label: "Pending",    icon: Clock,        color: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Processing", icon: RefreshCw,    color: "bg-blue-100 text-blue-700" },
  shipped:    { label: "Shipped",    icon: Truck,        color: "bg-purple-100 text-purple-700" },
  delivered:  { label: "Delivered",  icon: CheckCircle,  color: "bg-green-100 text-green-700" },
  cancelled:  { label: "Cancelled",  icon: XCircle,      color: "bg-red-100 text-red-700" },
};

const TABS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view orders</h2>
          <Link href="/login?next=/orders" className="text-primary font-semibold hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  if (MOCK_ORDERS.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Your order history will appear here.</p>
          <Link href="/shop" className="bg-primary text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

        <div className="space-y-4">
          {MOCK_ORDERS.map((order) => {
            const status = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
            const StatusIcon = status.icon;
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-gray-900 text-sm">{order.id}</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1 mb-1">{order.product}{order.items > 1 ? ` + ${order.items - 1} more` : ""}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(order.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>·</span>
                      <span className="font-semibold text-gray-900">₦{order.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
