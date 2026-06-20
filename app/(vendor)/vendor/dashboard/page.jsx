"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertCircle,
  ListTodo,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

const WHATSAPP_GROUP =
  "https://chat.whatsapp.com/ENs2ZmlNiix1PE65V4e3jF?mode=gi_t";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";
import Link from "next/link";

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchVendorStats() {
  const r = await fetch("/api/vendor/stats");
  return r.json();
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  },
  processing: {
    label: "Processing",
    cls: "bg-blue-50  text-blue-700  border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  },
  shipped: {
    label: "Shipped",
    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  },
  delivered: {
    label: "Delivered",
    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-50   text-red-700   border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Mobile-first stat hierarchy ───────────────────────────────────────────────

function HeroCard({ label, value, sub, isLoading }) {
  return (
    <div className="bg-primary rounded-2xl p-5 text-white relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/5" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">{label}</p>
      {isLoading
        ? <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
        : <p className="text-4xl font-extrabold mt-1 leading-none">{value}</p>
      }
      {sub && <p className="text-xs text-white/60 mt-2">{sub}</p>}
    </div>
  );
}

function MetricTile({ label, value, sub, icon: Icon, colorClass }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-base font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

const EMPTY_CHART = [
  { day: "Mon", revenue: 0 },
  { day: "Tue", revenue: 0 },
  { day: "Wed", revenue: 0 },
  { day: "Thu", revenue: 0 },
  { day: "Fri", revenue: 0 },
  { day: "Sat", revenue: 0 },
  { day: "Sun", revenue: 0 },
];

export default function VendorOverviewPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: fetchVendorStats,
    staleTime: 30_000,
    retry: false,
  });

  const stats = statsData?.stats ?? {};
  const revenueChart = statsData?.revenue_chart ?? EMPTY_CHART;
  const recentOrders = statsData?.recent_orders ?? [];
  const topProducts = statsData?.top_products ?? [];
  const todos = statsData?.todos ?? [];

  return (
    <div className="space-y-6">
      {/* Hero: Revenue */}
      <HeroCard
        label="Revenue (30d)"
        value={`₦${(stats.revenue || 0).toLocaleString()}`}
        sub="from completed orders this month"
        isLoading={isLoading}
      />

      {/* 3-col metric strip */}
      <div className="grid grid-cols-3 gap-3">
        <MetricTile
          label="Total Orders"
          value={(stats.orders || 0).toLocaleString()}
          sub={`${stats.pending_orders || 0} pending`}
          icon={ShoppingCart}
          colorClass="bg-blue-500"
        />
        <MetricTile
          label="Products Live"
          value={(stats.products || 0).toLocaleString()}
          icon={Package}
          colorClass="bg-emerald-500"
        />
        <MetricTile
          label="Wallet Balance"
          value={`₦${(stats.wallet_balance || 0).toLocaleString()}`}
          sub="available"
          icon={DollarSign}
          colorClass="bg-violet-500"
        />
      </div>

      {/* Pending orders alert */}
      {(stats.pending_orders || 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
              Action Required
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You have <strong>{stats.pending_orders}</strong> pending{" "}
              {stats.pending_orders === 1 ? "order" : "orders"} waiting to be
              confirmed.
            </p>
          </div>
          <Link
            href="/vendor/orders"
            className="text-xs font-bold text-amber-800 dark:text-amber-400 underline shrink-0"
          >
            View orders
          </Link>
        </div>
      )}

      {/* To-Do action queue */}
      {todos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
            <ListTodo className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              Action Required ({todos.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {todos.map((todo) => (
              <Link
                key={todo.href}
                href={todo.href}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    todo.urgency === "high"
                      ? "bg-red-500"
                      : todo.urgency === "medium"
                        ? "bg-amber-500"
                        : "bg-blue-400"
                  }`}
                />
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {todo.label}
                </p>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Revenue This Week
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Daily revenue for the last 7 days
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Last 7 days
          </span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueChart}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="vendorRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#560238" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#560238" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [`₦${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#560238"
                strokeWidth={2}
                fill="url(#vendorRevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders + Top products */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Recent orders */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Recent Orders
            </h3>
            <Link
              href="/vendor/orders"
              className="text-xs text-primary font-semibold hover:underline"
            >
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No orders yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/vendor/orders/${order.id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-2 -mx-2 transition-colors"
                >
                  <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      #CM-{order.id?.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {order.customer}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      ₦{(order.amount || 0).toLocaleString()}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Top Products
            </h3>
            <Link
              href="/vendor/products"
              className="text-xs text-primary font-semibold hover:underline"
            >
              All products
            </Link>
          </div>
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No sales yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.id ?? i} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  {p.image ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {p.sold} sold
                    </p>
                  </div>
                  <p className="text-xs font-bold text-primary shrink-0">
                    ₦{(p.revenue || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            href: "/vendor/products/new",
            label: "Add Product",
            color: "bg-primary text-white",
          },
          {
            href: "/vendor/orders",
            label: "Manage Orders",
            color: "bg-blue-600 text-white",
          },
          {
            href: "/vendor/wallet",
            label: "Withdraw Funds",
            color: "bg-emerald-600 text-white",
          },
          {
            href: "/vendor/analytics",
            label: "View Analytics",
            color: "bg-violet-600 text-white",
          },
        ].map(({ href, label, color }) => (
          <Link
            key={href}
            href={href}
            className={`${color} rounded-2xl p-4 font-semibold text-sm text-center hover:opacity-90 transition-opacity`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* WhatsApp community */}
      <a
        href={WHATSAPP_GROUP}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900 dark:text-green-300 text-sm">
            Join our vendor WhatsApp group
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            Get tips, announcements, and direct support from our team.
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </a>
    </div>
  );
}
