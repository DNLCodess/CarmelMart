"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Package, Truck, CheckCircle, Clock, XCircle,
  MapPin, Phone, ArrowLeft, RefreshCw, Copy,
  AlertTriangle, ThumbsUp, Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

// ── Data fetching ──────────────────────────────────────────────────────────────
async function fetchOrder(id) {
  const r = await fetch(`/api/customer/orders/${id}`);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || "Order not found");
  }
  return r.json();
}

async function fetchExistingReview(id) {
  const r = await fetch(`/api/customer/orders/${id}/rider-review`);
  if (!r.ok) return { review: null };
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

// ── Star rating ────────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent" };

// ── Rider review form ──────────────────────────────────────────────────────────
function RiderReviewForm({ orderId, onSubmitted }) {
  const [rating,          setRating]          = useState(0);
  const [onTime,          setOnTime]          = useState(null);
  const [professional,    setProfessional]    = useState(null);
  const [pkgCondition,    setPkgCondition]    = useState(null);
  const [wouldRecommend,  setWouldRecommend]  = useState(null);
  const [comment,         setComment]         = useState("");

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/customer/orders/${orderId}/rider-review`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          rating,
          on_time:           onTime,
          professional,
          package_condition: pkgCondition,
          would_recommend:   wouldRecommend,
          comment:           comment.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to submit review");
      return d;
    },
    onSuccess: () => {
      toast.success("Thank you for your review!");
      onSubmitted();
    },
    onError: (e) => toast.error(e.message),
  });

  const BoolButton = ({ value, current, onSelect, label }) => (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
        current === value
          ? value
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "bg-red-500 border-red-500 text-white"
          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  const BoolRow = ({ question, value, onChange }) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">{question}</p>
      <div className="flex gap-2">
        <BoolButton value={true}  current={value} onSelect={onChange} label="Yes" />
        <BoolButton value={false} current={value} onSelect={onChange} label="No"  />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Rate Your Delivery
      </h2>

      {/* Star rating */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Overall experience</p>
        <StarPicker value={rating} onChange={setRating} />
        {rating > 0 && (
          <p className="text-sm font-bold text-amber-500">{STAR_LABELS[rating]}</p>
        )}
      </div>

      {/* Yes/No questions */}
      <BoolRow
        question="Was the delivery on time?"
        value={onTime}
        onChange={setOnTime}
      />
      <BoolRow
        question="Was the rider professional and polite?"
        value={professional}
        onChange={setProfessional}
      />
      <BoolRow
        question="Was your package in good condition?"
        value={pkgCondition}
        onChange={setPkgCondition}
      />
      <BoolRow
        question="Would you recommend this rider?"
        value={wouldRecommend}
        onChange={setWouldRecommend}
      />

      {/* Optional comment */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Additional comments (optional)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Tell us more about your delivery experience…"
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <button
        onClick={() => submit()}
        disabled={isPending || rating === 0}
        className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2"
      >
        {isPending ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Star className="w-4 h-4 fill-white" />
            Submit Review
          </>
        )}
      </button>
    </div>
  );
}

// ── Review submitted summary ───────────────────────────────────────────────────
function ReviewSummary({ review }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Delivery Review Submitted</p>
          <div className="flex gap-0.5 mt-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-amber-800 italic">"{review.comment}"</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customer-order", id],
    queryFn:  () => fetchOrder(id),
    enabled:  !!id,
    staleTime: 30_000,
    retry: false,
  });

  const { data: reviewData, refetch: refetchReview } = useQuery({
    queryKey: ["customer-order-review", id],
    queryFn:  () => fetchExistingReview(id),
    enabled:  !!id && data?.order?.status === "delivered",
    staleTime: 300_000,
  });

  // ── Supabase Realtime: live order status ────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    const channel  = supabase
      .channel(`order-status-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["customer-order", id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

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

  const subtotal    = (order?.items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = order?.delivery_fee ?? 0;
  const total       = order?.total ?? subtotal + deliveryFee;
  const addr        = order?.address ?? {};

  const canCancel   = ["pending", "confirmed", "processing"].includes(order?.status);
  const canConfirm  = ["pending", "confirmed", "processing", "shipped"].includes(order?.status);
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  const existingReview = reviewData?.review ?? null;
  const showReviewForm = isDelivered && !existingReview && !reviewSubmitted;
  const showReviewDone = isDelivered && (existingReview || reviewSubmitted);

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
                    <p className="text-xs mt-0.5">The rider will contact you before arrival. Please confirm receipt once you get your order.</p>
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

              {/* Rider review — submitted summary */}
              {showReviewDone && (
                <ReviewSummary review={existingReview ?? { rating: 5, comment: null }} />
              )}

              {/* Rider review — form */}
              {showReviewForm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <RiderReviewForm
                    orderId={id}
                    onSubmitted={() => {
                      setReviewSubmitted(true);
                      refetchReview();
                    }}
                  />
                </motion.div>
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
