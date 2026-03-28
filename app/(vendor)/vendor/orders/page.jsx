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

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
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
    onError: (e) => toast.error(e.message),
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
        const nameMatch = (o.customer_name ?? "").toLowerCase().includes(q);
        return idMatch || nameMatch;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const STATUS_TABS = [
    { key: "all",        label: "All"        },
    { key: "pending",    label: "Pending"    },
    { key: "processing", label: "Processing" },
    { key: "shipped",    label: "Shipped"    },
    { key: "delivered",  label: "Delivered"  },
    { key: "cancelled",  label: "Cancelled"  },
  ];

  return (
    <div className="space-y-5">
      {/* Search + Status tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit overflow-x-auto">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === key ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No {statusFilter !== "all" ? statusFilter : ""} orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Customer</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-primary">{order.shortId ?? `#CM-${order.id?.slice(0, 8).toUpperCase()}`}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.items} item{order.items !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
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
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/vendor/orders/${order.id}`}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {order.status === "pending" && (
                          <button
                            onClick={() => updateStatus({ orderId: order.id, status: "processing" })}
                            disabled={updating}
                            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Confirm order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === "processing" && (
                          <button
                            onClick={() => updateStatus({ orderId: order.id, status: "shipped" })}
                            disabled={updating}
                            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title="Mark as shipped"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === "shipped" && (
                          <button
                            onClick={() => updateStatus({ orderId: order.id, status: "delivered" })}
                            disabled={updating}
                            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Mark as delivered"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
