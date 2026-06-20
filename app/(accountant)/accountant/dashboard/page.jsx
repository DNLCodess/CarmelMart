"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  RotateCcw,
  RefreshCw,
  ChevronRight,
  BadgeCheck,
  ShoppingCart,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

const PIE_COLORS = ["#560238", "#10b981", "#3b82f6"];


// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchFinancials(range, page) {
  const r = await fetch(
    `/api/accountant/financials?range=${range}&page=${page}`,
  );
  if (!r.ok) throw new Error("Failed to load financial data");
  return r.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Full-width hero card for the primary metric (GMV)
function GmvHero({ value, completedCount, refundedCount, totalRefunded, isLoading }) {
  return (
    <div className="bg-primary rounded-2xl p-5 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
        Gross Revenue (GMV)
      </p>
      {isLoading ? (
        <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
      ) : (
        <p className="text-4xl font-extrabold mt-1 leading-none">{value}</p>
      )}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-3 py-1">
          <TrendingUp className="w-3.5 h-3.5" />
          {completedCount ?? 0} completed orders
        </span>
        {(refundedCount ?? 0) > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-white/70 rounded-full px-3 py-1">
            <RotateCcw className="w-3.5 h-3.5" />
            {refundedCount} refunded
          </span>
        )}
      </div>
    </div>
  );
}

// Compact metric tile — used in the 3-col breakdown strip
function SubMetric({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        <p className="text-base font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

// Statement-style panel — list of labelled rows, like a mini bank statement
function StatementPanel({ title, rows }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </p>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
        {rows.map(({ label, sub, value, valueClass }) => (
          <div key={label} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                {label}
              </p>
              {sub && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                  {sub}
                </p>
              )}
            </div>
            <p className={`text-sm font-bold shrink-0 ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountantDashboardPage() {
  const [range, setRange] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["accountant-financials", range],
    queryFn: () => fetchFinancials(range, 1),
    staleTime: 60_000,
  });

  const s     = data?.summary      ?? {};
  const chart = data?.revenueChart ?? [];

  const fmtN   = (n) => `₦${(n ?? 0).toLocaleString()}`;
  const fmtPct = (n) => (n != null ? `${(n * 100).toFixed(1)}%` : "—");

  const pieData = [
    { name: "Product Revenue", value: s.totalProductRevenue ?? 0 },
    { name: "Platform Fees",   value: s.platformFees        ?? 0 },
    { name: "Delivery Fees",   value: s.totalDeliveryFees   ?? 0 },
  ].filter((d) => d.value > 0);

  const handleRangeChange = (v) => setRange(v);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">
            Financial Overview
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Full breakdown of revenue, fees, and order financials
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRangeChange(value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                range === value
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero: GMV ── */}
      <GmvHero
        value={fmtN(s.gmv)}
        completedCount={s.completedCount}
        refundedCount={s.refundedCount}
        totalRefunded={s.totalRefunded}
        isLoading={isLoading}
      />

      {/* ── 3-col breakdown strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <SubMetric
          label="Product"
          value={fmtN(s.totalProductRevenue)}
          icon={Package}
          colorClass="bg-violet-500"
        />
        <SubMetric
          label="Delivery"
          value={fmtN(s.totalDeliveryFees)}
          icon={Truck}
          colorClass="bg-sky-500"
        />
        <SubMetric
          label={`Fee (${fmtPct(s.feeRate)})`}
          value={fmtN(s.platformFees)}
          icon={DollarSign}
          colorClass="bg-emerald-500"
        />
      </div>

      {/* ── Statement panels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatementPanel
          title="Payouts & Liabilities"
          rows={[
            {
              label: "Vendor Payouts (Paid)",
              sub: "transferred to vendors",
              value: fmtN(s.totalPayoutsCompleted),
              valueClass: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Vendor Payouts (Pending)",
              sub: "awaiting processing",
              value: fmtN(s.totalPayoutsPending),
              valueClass: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Refunds Issued",
              sub: `${s.refundedCount ?? 0} refunded orders`,
              value: fmtN(s.totalRefunded),
              valueClass: "text-red-600 dark:text-red-400",
            },
          ]}
        />
        <StatementPanel
          title="Cash Flow & Wallets"
          rows={[
            {
              label: "Gateway Receipts",
              sub: "card & transfer payments",
              value: fmtN(s.gatewayReceipts),
              valueClass: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Wallet Credits",
              sub: "money added to wallets",
              value: fmtN(s.walletCredits),
              valueClass: "text-green-600 dark:text-green-400",
            },
            {
              label: "Wallet Debits",
              sub: "money spent from wallets",
              value: fmtN(s.walletDebits),
              valueClass: "text-orange-600 dark:text-orange-400",
            },
          ]}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Revenue trend chart */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4">
            Daily Revenue Breakdown
          </h3>
          {isLoading ? (
            <div className="h-52 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chart}
                  margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      `₦${v.toLocaleString()}`,
                      name === "product"
                        ? "Product"
                        : name === "delivery"
                          ? "Delivery"
                          : "Platform Fee",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(v) =>
                      v === "product"
                        ? "Product"
                        : v === "delivery"
                          ? "Delivery"
                          : "Platform Fee"
                    }
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="product"
                    fill="#b82060"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="delivery"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="platform"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Fee breakdown pie */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4">
            Revenue Split
          </h3>
          {isLoading || pieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              {isLoading ? (
                <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No data
                </p>
              )}
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center">
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `₦${v.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 w-full mt-1">
                {pieData.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="text-gray-600 dark:text-gray-400">
                        {d.name}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {s.gmv > 0
                        ? `${((d.value / s.gmv) * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick links to detail pages ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/accountant/orders",       label: "Order Breakdown",     sub: `${s.orderCount ?? 0} total orders`,         icon: ShoppingCart,    color: "bg-primary/10 dark:bg-primary/20 text-primary"        },
          { href: "/accountant/payouts",       label: "Vendor Payouts",      sub: "full payout history",                        icon: Wallet,          color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
          { href: "/accountant/transactions",  label: "Wallet Transactions", sub: "complete audit log",                         icon: ArrowLeftRight,  color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600"          },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Fee explainer card ── */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl px-5 py-4 flex items-start gap-3">
        <BadgeCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold text-sm">How the numbers work</p>
          <p><strong>Order Total</strong> = Product Amount + Delivery Fee — what the customer pays.</p>
          <p><strong>Platform Fee</strong> = {s.feeRate != null ? `${(s.feeRate * 100).toFixed(1)}%` : "configured %"} of Order Total — the platform&apos;s earning per order.</p>
          <p><strong>Delivery Fee</strong> = Charged to the customer, passed to the rider/service.</p>
          <p><strong>Vendor Payout</strong> = Order Total − Platform Fee — transferred to vendor bank account.</p>
        </div>
      </div>
    </div>
  );
}
