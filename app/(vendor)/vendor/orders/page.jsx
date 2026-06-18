"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Clock, RefreshCw, Truck, CheckCircle, XCircle, Eye, Search,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchVendorOrders() {
  const r = await fetch("/api/vendor/orders");
  return r.json();
}

const STATUS_CFG = {
  pending:    { label: "Pending",    icon: Clock,        cls: "bg-amber-50  text-amber-700  border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"   },
  processing: { label: "Processing", icon: RefreshCw,    cls: "bg-blue-50   text-blue-700   border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"    },
  shipped:    { label: "Shipped",    icon: Truck,        cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"  },
  delivered:  { label: "Delivered",  icon: CheckCircle,  cls: "bg-green-50  text-green-700  border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"   },
  cancelled:  { label: "Cancelled",  icon: XCircle,      cls: "bg-red-50    text-red-700    border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"     },
};

const STATUS_TABS = [
  { key: "all",        label: "All"        },
  { key: "pending",    label: "Pending"    },
  { key: "processing", label: "Processing" },
  { key: "shipped",    label: "Shipped"    },
  { key: "delivered",  label: "Delivered"  },
  { key: "cancelled",  label: "Cancelled"  },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function OrderActions({ order, updateStatus, updating }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/vendor/orders/${order.id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 hover:underline transition-colors"
      >
        <Eye className="w-3.5 h-3.5" /> View
      </Link>
      {order.status === "pending" && (
        <button
          onClick={() => updateStatus({ orderId: order.id, status: "processing" })}
          disabled={updating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Confirm
        </button>
      )}
      {order.status === "processing" && (
        <button
          onClick={() => updateStatus({ orderId: order.id, status: "shipped" })}
          disabled={updating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-600 border border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
        >
          <Truck className="w-3.5 h-3.5" /> Ship
        </button>
      )}
      {order.status === "shipped" && (
        <button
          onClick={() => updateStatus({ orderId: order.id, status: "delivered" })}
          disabled={updating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 border border-green-200 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Delivered
        </button>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-orders"],
    queryFn: fetchVendorOrders,
    staleTime: 30_000,
    retry: false,
  });

  const orders = data?.orders ?? [];

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const r = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      return d;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Order marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      qc.invalidateQueries({ queryKey: ["vendor-stats"] });
    },
    onError: (e) => toast.error(e.message || "Failed to update order status. Please try again."),
  });

  const counts = useMemo(() => {
    const c = { all: orders.length };
    Object.keys(STATUS_CFG).forEach((s) => { c[s] = orders.filter((o) => o.status === s).length; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q) {
        const idMatch   = String(o.id).toLowerCase().includes(q);
        const nameMatch = (o.customer ?? "").toLowerCase().includes(q);
        return idMatch || nameMatch;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-4">

      {/* Search — full width on mobile */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or customer…"
          className="w-full sm:max-w-xs pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Status tabs — scrollable pill bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shrink-0 ${
              statusFilter === key
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {label} <span className={`ml-0.5 ${statusFilter === key ? "opacity-80" : "opacity-60"}`}>({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">
              No {statusFilter !== "all" ? statusFilter : ""} orders found
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (< lg) ───────────────────────────────────── */}
            <div className="lg:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((order) => (
                <div key={order.id} className="p-4 space-y-3">
                  {/* Row 1: order ID + status */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary text-sm">
                        {order.shortId ?? `#CM-${order.id?.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {order.items} item{order.items !== 1 ? "s" : ""}
                        {order.date ? ` · ${order.date}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Row 2: customer info */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {(order.customer ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{order.customer}</p>
                      {order.phone && (
                        <a href={`tel:${order.phone}`} className="text-xs text-primary hover:underline">
                          {order.phone}
                        </a>
                      )}
                    </div>
                    <p className="ml-auto font-bold text-gray-900 dark:text-gray-100 shrink-0">
                      ₦{(order.amount || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Row 3: actions */}
                  <OrderActions order={order} updateStatus={updateStatus} updating={updating} />
                </div>
              ))}
            </div>

            {/* ── Desktop table (lg+) ──────────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-primary">{order.shortId ?? `#CM-${order.id?.slice(0, 8).toUpperCase()}`}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.items} item{order.items !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{order.customer}</p>
                        {order.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{order.phone}</p>}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        ₦{(order.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell">{order.date}</td>
                      <td className="px-5 py-4">
                        <OrderActions order={order} updateStatus={updateStatus} updating={updating} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
