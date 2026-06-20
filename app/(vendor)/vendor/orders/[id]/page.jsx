"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  ChevronLeft, Package, MapPin, Phone, User, Clock,
  Truck, CheckCircle, XCircle, RefreshCw, AlertCircle, CreditCard,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchOrderDetail(id) {
  const r = await fetch(`/api/vendor/orders/${id}`);
  if (!r.ok) throw new Error("Order not found");
  return r.json();
}

const STATUS_CFG = {
  pending:    { label: "Pending",    cls: "bg-amber-50  text-amber-700  border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",  icon: Clock        },
  processing: { label: "Processing", cls: "bg-blue-50   text-blue-700   border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",   icon: RefreshCw    },
  shipped:    { label: "Shipped",    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800", icon: Truck        },
  delivered:  { label: "Delivered",  cls: "bg-green-50  text-green-700  border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",  icon: CheckCircle  },
  cancelled:  { label: "Cancelled",  cls: "bg-red-50    text-red-700    border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",    icon: XCircle      },
};

const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.cls}`}>
      <Icon className="w-4 h-4" /> {cfg.label}
    </span>
  );
}

function StatusTimeline({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STATUS_STEPS.map((step, idx) => {
        const done    = idx < currentIdx;
        const current = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              current ? "bg-primary text-white"
              : done   ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                       : "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500"
            }`}>
              {done && <CheckCircle className="w-3 h-3" />}
              {current && <span className="w-2 h-2 bg-white rounded-full" />}
              <span className="capitalize">{step}</span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-px w-6 ${done || current ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-200 dark:bg-gray-600"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VendorOrderDetailPage() {
  const { id } = useParams();
  const qc     = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-order-detail", id],
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
    staleTime: 30_000,
    retry: false,
  });

  const order = data?.order ?? null;

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: async ({ status, tracking_number }) => {
      const r = await fetch(`/api/vendor/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, tracking_number }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      return d;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Order marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["vendor-order-detail", id] });
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      setShowTrackingInput(false);
      setTrackingNumber("");
    },
    onError: (e) => toast.error(e.message || "Failed to update order status. Please try again."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || (!isLoading && !order)) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">Order not found</p>
        <Link href="/vendor/orders" className="text-sm text-primary underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const addr = order.delivery_address ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/vendor/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <div className="flex-1" />
        <StatusBadge status={order.status} />
      </div>

      {/* Order ID + timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">#CM-{order.id?.slice(0, 8).toUpperCase()}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{order.date} · {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1" />
          <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">₦{(order.amount || 0).toLocaleString()}</p>
        </div>

        {order.status !== "cancelled" && <StatusTimeline status={order.status} />}
      </div>

      {/* Actions */}
      {order.status !== "cancelled" && order.status !== "delivered" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Update Status</h3>

          {order.status === "pending" && (
            <button
              onClick={() => updateStatus({ status: "processing" })}
              disabled={updating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Start Processing
            </button>
          )}

          {order.status === "processing" && !showTrackingInput && (
            <button
              onClick={() => setShowTrackingInput(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Truck className="w-4 h-4" />
              Mark as Shipped
            </button>
          )}

          {order.status === "processing" && showTrackingInput && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tracking Number <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG-1234567890"
                  className="w-full max-w-xs px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus({ status: "shipped", tracking_number: trackingNumber || undefined })}
                  disabled={updating}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  {updating ? "Updating…" : "Confirm Shipment"}
                </button>
                <button
                  onClick={() => { setShowTrackingInput(false); setTrackingNumber(""); }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {order.status === "shipped" && (
            <button
              onClick={() => updateStatus({ status: "delivered" })}
              disabled={updating}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {updating ? "Updating…" : "Mark as Delivered"}
            </button>
          )}
        </div>
      )}

      {/* Customer + delivery */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Customer */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Customer</h3>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" /> {order.customer ?? "—"}
          </div>
          {order.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
              <a href={`tel:${order.phone}`} className="hover:text-primary transition-colors">
                {order.phone}
              </a>
            </div>
          )}
        </div>

        {/* Delivery address */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Delivery Address</h3>
          {addr.street || addr.city ? (
            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <div>
                {addr.street && <p>{addr.street}</p>}
                {addr.landmark && <p className="text-gray-500 dark:text-gray-400">Near: {addr.landmark}</p>}
                {addr.city && <p>{addr.city}{addr.state ? `, ${addr.state}` : ""}</p>}
                {addr.phone && (
                  <a href={`tel:${addr.phone}`} className="flex items-center gap-1 text-primary font-semibold mt-1">
                    <Phone className="w-3.5 h-3.5" /> {addr.phone}
                  </a>
                )}
                {addr.delivery_instructions && (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1">
                    Note: {addr.delivery_instructions}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No delivery address available</p>
          )}
        </div>
      </div>

      {/* Order items */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Order Items</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.image
                    ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                    : <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.product_name ?? item.product_id}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity} × ₦{(item.unit_price || 0).toLocaleString()}</p>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">₦{(item.total || item.unit_price * item.quantity || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Payment Summary</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700">
          {[
            { label: "My Items Subtotal", value: `₦${(order.items_subtotal ?? order.amount ?? 0).toLocaleString()}` },
            { label: "Delivery Fee",      value: `₦${(order.delivery_fee ?? 0).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-900">
            <span className="font-bold text-gray-900 dark:text-gray-100">Order Total</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100">₦{(order.amount || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3 text-xs">
          {order.payment_status && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold border ${
              order.payment_status === "paid"
                ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800"
                : "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800"
            }`}>
              {order.payment_status === "paid" ? "Paid" : "Payment Pending"}
            </span>
          )}
          {order.payment_method && (
            <span className="text-gray-500 dark:text-gray-400">
              via {{ card: "Card (Flutterwave)", pod: "Pay on Delivery", wallet: "Wallet", transfer: "Bank Transfer" }[order.payment_method] ?? order.payment_method}
            </span>
          )}
          {order.payment_ref && (
            <span className="font-mono text-gray-400 dark:text-gray-500">Ref: {order.payment_ref}</span>
          )}
        </div>
      </div>
    </div>
  );
}
