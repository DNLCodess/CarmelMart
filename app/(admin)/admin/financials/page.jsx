"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, Wallet, RotateCcw, RefreshCw, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const RANGES = [
  { value: "7d",  label: "7 Days"  },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

async function fetchFinancials(range) {
  const r = await fetch(`/api/admin/financials?range=${range}`);
  return r.json();
}

function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminFinancialsPage() {
  const [range, setRange] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financials", range],
    queryFn:  () => fetchFinancials(range),
    staleTime: 60_000,
    retry: false,
  });

  const s    = data?.summary      ?? {};
  const chart = data?.revenueChart ?? [];
  const txns  = data?.transactions ?? [];

  return (
    <div className="space-y-6">
      {/* Header + range */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Financial Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform revenue, fees, and wallet activity</p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                range === value ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Gross GMV"       value={`₦${(s.gmv ?? 0).toLocaleString()}`}               sub={`${(s.feeRate ?? 0.05) * 100}% platform fee`}  icon={TrendingUp}   color="bg-primary" />
        <KpiCard label="Platform Fees"   value={`₦${(s.platformFees ?? 0).toLocaleString()}`}      sub="5% of GMV"                                      icon={DollarSign}   color="bg-emerald-500" />
        <KpiCard label="Total Refunded"  value={`₦${(s.totalRefunded ?? 0).toLocaleString()}`}     sub="from refunded orders"                           icon={RotateCcw}    color="bg-red-500" />
        <KpiCard label="Wallet Balances" value={`₦${(s.totalWalletBalances ?? 0).toLocaleString()}`} sub="total held across all users"                  icon={Wallet}       color="bg-violet-500" />
      </div>

      {/* Reconciliation row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Gateway Receipts",  value: s.gatewayReceipts  ?? 0, cls: "text-green-600 dark:text-green-400" },
          { label: "Wallet Credits",    value: s.walletCredits    ?? 0, cls: "text-blue-600 dark:text-blue-400"   },
          { label: "Wallet Debits",     value: s.walletDebits     ?? 0, cls: "text-amber-600 dark:text-amber-400" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{label}</p>
            <p className={`text-lg font-extrabold ${cls}`}>₦{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Fees chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5">GMV vs Platform Fees</h3>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => [`₦${v.toLocaleString()}`, name === "gmv" ? "GMV" : "Platform Fee"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Legend formatter={(v) => v === "gmv" ? "GMV" : "Platform Fee"} iconType="circle" iconSize={8} />
                <Bar dataKey="gmv"  fill="#560238" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fees" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Wallet transaction audit log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Wallet Transaction Audit Log</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last 50 transactions in period</p>
        </div>
        {isLoading ? (
          <div className="p-10 text-center"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin mx-auto" /></div>
        ) : txns.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No transactions in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Reference</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{t.userEmail}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{t.userRole}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400 dark:text-gray-500 hidden sm:table-cell">{t.reference ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      <span className={`flex items-center justify-end gap-0.5 text-sm ${t.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {t.type === "credit" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        ₦{t.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400 dark:text-gray-500 hidden md:table-cell">{t.date}</td>
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
