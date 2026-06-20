"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Truck,
  Package,
  SlidersHorizontal,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "7d",  label: "7 Days"   },
  { value: "30d", label: "30 Days"  },
  { value: "90d", label: "90 Days"  },
  { value: "all", label: "All Time" },
];

const STATUSES = [
  { value: "",           label: "All Statuses" },
  { value: "pending",    label: "Pending"    },
  { value: "confirmed",  label: "Confirmed"  },
  { value: "processing", label: "Processing" },
  { value: "shipped",    label: "Shipped"    },
  { value: "delivered",  label: "Delivered"  },
  { value: "cancelled",  label: "Cancelled"  },
  { value: "refunded",   label: "Refunded"   },
];

const PAYMENTS = [
  { value: "",         label: "All Methods" },
  { value: "card",     label: "Card"        },
  { value: "transfer", label: "Transfer"    },
  { value: "wallet",   label: "Wallet"      },
  { value: "pod",      label: "Pay on Delivery" },
];

const STATUS_CLASSES = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchOrders({ range, status, payment, search, page }) {
  const params = new URLSearchParams({ range, page });
  if (status)  params.set("status",  status);
  if (payment) params.set("payment", payment);
  if (search)  params.set("search",  search);
  const r = await fetch(`/api/accountant/orders?${params}`);
  if (!r.ok) throw new Error("Failed to load orders");
  return r.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStrip({ summary, isLoading }) {
  const fmtN = (n) => `₦${(n ?? 0).toLocaleString()}`;
  const items = [
    { label: "GMV",           value: fmtN(summary?.gmv),           icon: ShoppingCart, color: "bg-primary/10 text-primary"              },
    { label: "Platform Fees", value: fmtN(summary?.platformFees),  icon: DollarSign,   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { label: "Delivery Fees", value: fmtN(summary?.deliveryFees),  icon: Truck,        color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"                 },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 flex flex-col gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
            {isLoading
              ? <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              : <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{total} orders total</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountantOrdersPage() {
  const [range,   setRange]   = useState("30d");
  const [status,  setStatus]  = useState("");
  const [payment, setPayment] = useState("");
  const [search,  setSearch]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page,    setPage]    = useState(1);
  const [searchTimer, setSearchTimer] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["accountant-orders", range, status, payment, debouncedSearch, page],
    queryFn: () => fetchOrders({ range, status, payment, search: debouncedSearch, page }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const orders     = data?.orders     ?? [];
  const summary    = data?.summary    ?? {};
  const pagination = data?.pagination ?? {};
  const fmtN       = (n) => `₦${(n ?? 0).toLocaleString()}`;

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer);
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
    setSearchTimer(t);
  };

  const handleFilter = (setter) => (val) => { setter(val); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Order Breakdown</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Per-order financial detail with fees</p>
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} isLoading={isLoading} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          {/* Range */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg">
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { handleFilter(setRange)(value); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  range === value
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={status}
            onChange={(e) => handleFilter(setStatus)(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>

          <select
            value={payment}
            onChange={(e) => handleFilter(setPayment)(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAYMENTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>

          {isFetching && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />}
        </div>
      </div>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-48 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
            <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No orders found</p>
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{o.shortId}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.customer}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Order Total</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{fmtN(o.orderTotal)}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Product Amount</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{fmtN(o.productAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Delivery Fee</p>
                  <p className="font-semibold text-sky-600 dark:text-sky-400 mt-0.5">{fmtN(o.deliveryFee)}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Platform Fee</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{fmtN(o.platformFee)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/60">
                <span className="capitalize">{o.paymentMethod}</span>
                <span>{o.date}</span>
              </div>
            </div>
          ))
        )}
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
                {["Order ID", "Customer", "Status", "Order Total", "Product Amt", "Delivery", "Platform Fee", "Method", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{o.shortId}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{o.customer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{o.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtN(o.orderTotal)}</td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtN(o.productAmount)}</td>
                    <td className="px-4 py-3.5 text-sky-600 dark:text-sky-400 whitespace-nowrap">{fmtN(o.deliveryFee)}</td>
                    <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmtN(o.platformFee)}</td>
                    <td className="px-4 py-3.5 capitalize text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{o.paymentMethod}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{o.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{pagination.total} orders total</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
