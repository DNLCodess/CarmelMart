"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Package, Truck, CheckCircle, Clock, XCircle,
  MapPin, Phone, ArrowLeft, RefreshCw, Copy,
  AlertTriangle, ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

// ── Data fetching ──────────────────────────────────────────────────────────────
async function fetchOrder(id) {
  const r = await fetch(`/api/customer/orders/${id}`);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || "Order not found");
  }
  return r.json();
}

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:    { label: "Pending",    icon: Clock,       color: "bg-yellow-100 text-yellow-700" },
  confirmed:  { label: "Confirmed",  icon: CheckCircle, color: "bg-blue-100 text-blue-700"    },
  processing: { label: "Processing", icon: RefreshCw,   color: "bg-blue-100 text-blue-700"    },
  shipped:    { label: "Shipped",    icon: Truck,       color: "bg-purple-100 text-purple-700" },
  delivered:  { label: "Delivered",  icon: CheckCircle, color: "bg-green-100 text-green-700"  },
  cancelled:  { label: "Cancelled",  icon: XCircle,     color: "bg-red-100 text-red-700"      },
  refunded:   { label: "Refunded",   icon: RefreshCw,   color: "bg-gray-100 text-gray-700"    },
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const qc      = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customer-order", id],
    queryFn:  () => fetchOrder(id),
    enabled:  !!id,
    staleTime: 30_000,
    retry: false,
  });

  const order = data?.order ?? null;

  // ── Confirm receipt mutation ─────────────────────────────────────────────────
  const { mutate: confirmReceipt, isPending: confirming } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/customer/orders/${id}/confirm`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not confirm receipt");
      return d;
    },
    onSuccess: () => {
      toast.success("Receipt confirmed! Thank you.");
      qc.invalidateQueries({ queryKey: ["customer-order", id] });
      qc.invalidateQueries({ queryKey: ["customer-orders"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Cancel order mutation ────────────────────────────────────────────────────
  const { mutate: cancelOrder, isPending: cancelling } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/customer/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not cancel order");
      return d;
    },
    onSuccess: () => {
      toast.success("Order cancelled.");
      qc.invalidateQueries({ queryKey: ["customer-order", id] });
      qc.invalidateQueries({ queryKey: ["customer-orders"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.shortId ?? id);
    toast.success("Order ID copied");
  };

  // ── Error state ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h2 className="font-bold text-gray-900 text-lg mb-2">Order not found</h2>
          <p className="text-sm text-gray-500 mb-6">{error?.message}</p>
          <Link href="/orders" className="text-primary font-semibold text-sm hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const status    = STATUS_MAP[order?.status] ?? STATUS_MAP.pending;
  const StatusIcon = status.icon;

  const subtotal  = (order?.items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = order?.delivery_fee ?? 0;
  const total     = order?.total ?? subtotal + deliveryFee;
  const addr      = order?.address ?? {};

  const canCancel  = ["pending", "confirmed", "processing"].includes(order?.status);
  const canConfirm = ["pending", "confirmed", "processing", "shipped"].includes(order?.status);
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back + header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/orders" className="p-2 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{order?.shortId}</h1>
                  <button onClick={copyOrderId} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                  </span>
                </div>
                {order?.date && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Placed {new Date(order.date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {isLoading && <Skeleton />}

        {order && (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Left: tracking + items ──────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Tracking timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" /> Order Tracking
                </h2>

                {isCancelled ? (
                  <div className="flex items-center gap-3 text-red-600 bg-red-50 rounded-xl p-4">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Order Cancelled</p>
                      {order.notes && <p className="text-xs text-red-500 mt-0.5">{order.notes}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {order.tracking.map((step, i) => (
                      <div key={i} className="flex gap-4 pb-6 last:pb-0">
                        <div className="flex flex-col items-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              step.done ? "bg-primary" : "bg-gray-200"
                            }`}
                          >
                            {step.done
                              ? <CheckCircle className="w-4 h-4 text-white" />
                              : <div className="w-2 h-2 rounded-full bg-gray-400" />
                            }
                          </motion.div>
                          {i < order.tracking.length - 1 && (
                            <div className={`w-0.5 flex-1 mt-1 ${step.done ? "bg-primary/40" : "bg-gray-200"}`} />
                          )}
                        </div>
                        <div className="pb-2 pt-1">
                          <p className={`text-sm font-semibold ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {order.status === "shipped" && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
                    <p className="font-semibold">Out for Delivery</p>
                    <p className="text-xs mt-0.5">The vendor will contact you before arrival. Please confirm receipt once you get your order.</p>
                  </div>
                )}
              </div>

              {/* Customer action buttons */}
              {(canConfirm || canCancel) && !isCancelled && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">Actions</h3>

                  {canConfirm && (
                    <button
                      onClick={() => confirmReceipt()}
                      disabled={confirming}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {confirming ? "Confirming…" : "I Received This Order"}
                    </button>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => {
                        if (!confirm("Are you sure you want to cancel this order?")) return;
                        cancelOrder();
                      }}
                      disabled={cancelling}
                      className="w-full py-3 rounded-full border-2 border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
                    >
                      {cancelling ? "Cancelling…" : "Cancel Order"}
                    </button>
                  )}

                  {canCancel && (
                    <p className="text-xs text-gray-400 text-center">
                      Orders can only be cancelled before shipment.
                    </p>
                  )}
                </div>
              )}

              {/* Review prompt */}
              {isDelivered && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
                  <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 text-sm">Order Delivered!</p>
                    <p className="text-xs text-green-700 mt-0.5">Help other shoppers by leaving a review.</p>
                  </div>
                  {order.items?.[0]?.product_id && (
                    <Link
                      href={`/product/${order.items[0].product_id}`}
                      className="shrink-0 text-xs font-bold text-green-700 border border-green-300 rounded-full px-4 py-2 hover:bg-green-100 transition-colors"
                    >
                      Review
                    </Link>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Items Ordered
                </h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <Link href={item.product_id ? `/product/${item.product_id}` : "#"} className="shrink-0">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                          {item.image
                            ? <Image src={item.image} alt={item.name} fill className="object-cover" />
                            : <Package className="w-6 h-6 text-gray-300 m-auto mt-4" />
                          }
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={item.product_id ? `/product/${item.product_id}` : "#"}>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-primary">{item.name}</p>
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">₦{item.price.toLocaleString()} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: address + payment summary ──────────────────────── */}
            <div className="space-y-5">
              {/* Delivery address */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  {addr.fullName && <p className="font-semibold">{addr.fullName}</p>}
                  {addr.street   && <p>{[addr.houseNumber, addr.street].filter(Boolean).join(" ")}</p>}
                  {addr.landmark && <p className="text-gray-500">Near: {addr.landmark}</p>}
                  {(addr.city || addr.state) && (
                    <p>{[addr.area, addr.city, addr.lga, addr.state].filter(Boolean).join(", ")}</p>
                  )}
                  {addr.phone && (
                    <p className="flex items-center gap-1.5 font-medium mt-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`tel:${addr.phone}`} className="hover:text-primary">{addr.phone}</a>
                    </p>
                  )}
                  {addr.delivery_instructions && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      {addr.delivery_instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment & cost summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Payment Summary</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="font-medium text-gray-900">₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  {order.pod_deposit > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>POD Deposit Paid</span>
                      <span className="font-medium">₦{order.pod_deposit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base text-gray-900">
                    <span>Total</span>
                    <span className="text-primary">₦{total.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 pt-1">
                    {order.payment_method === "pod"
                      ? "Pay on Delivery"
                      : `Paid via ${order.payment_method === "bank_transfer" ? "Bank Transfer" : "Card / Online"}`
                    }
                    {order.payment_status === "paid" && (
                      <span className="ml-1.5 text-green-600 font-semibold">✓ Confirmed</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Dispute link */}
              {!isCancelled && !["pending"].includes(order.status) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-700">Issue with your order?</p>
                      <Link href="/help" className="text-primary text-xs font-semibold hover:underline">
                        Contact Support →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
