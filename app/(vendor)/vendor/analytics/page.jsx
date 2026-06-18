"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Lock, Gem } from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

async function fetchAnalytics(period) {
  const r = await fetch(`/api/vendor/analytics?period=${period}`);
  return r.json();
}

function AnalyticsGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
        Analytics is a Premium feature
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        Upgrade to Premium or VIP to unlock sales analytics, revenue charts, and top product insights.
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          href="/vendor/subscription"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Gem className="w-4 h-4" /> Upgrade to Premium
        </Link>
        <Link
          href="/vendor/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function VendorAnalyticsPage() {
  const [period, setPeriod] = useState("7d");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-analytics", period],
    queryFn: () => fetchAnalytics(period),
    staleTime: 60_000,
    retry: false,
  });

  // Show upgrade gate for free-tier vendors
  if (!isLoading && data?.error === "ANALYTICS_GATED") {
    return <AnalyticsGate />;
  }

  const chart        = data?.chart        ?? [];
  const topProducts  = data?.topProducts  ?? [];
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalOrders  = data?.totalOrders  ?? 0;

  const Spinner = () => (
    <div className="flex justify-center items-center h-full">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                period === p ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : "Last 90 days"}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (!chart.length && !topProducts.length) return;
            const rows = [
              ["Date", "Revenue (₦)", "Orders"],
              ...chart.map((r) => [r.label, r.revenue, r.orders]),
              [],
              ["Product", "Revenue (₦)", "Units Sold"],
              ...topProducts.map((p) => [p.name, p.revenue, p.orders]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = `analytics-${period}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={isLoading}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue",   value: isLoading ? "—" : `₦${totalRevenue.toLocaleString()}`,  sub: `${period} period`, color: "text-primary" },
          { label: "Total Orders",    value: isLoading ? "—" : totalOrders.toLocaleString(),           sub: "line items sold",  color: "text-blue-600"          },
          { label: "Avg Order Value", value: isLoading ? "—" : `₦${Math.round(totalRevenue / (totalOrders || 1)).toLocaleString()}`, sub: "per order item", color: "text-violet-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Revenue Breakdown</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Revenue for the selected period</p>
        <div className="h-64">
          {isLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => [`₦${v.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#560238" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Orders chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Order Volume</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Number of order line items per period</p>
        <div className="h-52">
          {isLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} fill="url(#ordersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Top Products by Revenue</h3>
        </div>
        {isLoading ? (
          <div className="py-8"><Spinner /></div>
        ) : topProducts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No sales data for this period yet.
          </div>
        ) : (
          <>
            {/* ── Mobile card list (< lg) ───────────────────────────────────── */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {topProducts.map((p, i) => (
                <div key={p.name} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{p.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/60">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">₦{p.revenue.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{p.orders} units sold</span>
                  </div>
                </div>
              ))}
            </div>
            {/* ── Desktop table (lg+) ──────────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {topProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-5 py-4 text-gray-400 dark:text-gray-500 font-semibold">{i + 1}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">{p.name}</td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-gray-100">₦{p.revenue.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-700 dark:text-gray-300">{p.orders}</td>
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
