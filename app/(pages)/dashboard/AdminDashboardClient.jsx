"use client";

import { useState } from "react";
import {
  Shield, Users, ShoppingBag, Store, TrendingUp, AlertCircle,
  CheckCircle, Clock, DollarSign, Package, BarChart3, Settings,
  ArrowUp, ArrowRight, Bell, Search, MoreHorizontal, Eye,
  ChevronRight, UserCheck, Ban, Zap, Activity,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Mock 30-day trend data (replace with real Supabase query)
const TREND_DATA = [
  { day: "1",  orders: 12, revenue: 480000 }, { day: "3",  orders: 18, revenue: 720000 },
  { day: "5",  orders: 24, revenue: 960000 }, { day: "7",  orders: 15, revenue: 600000 },
  { day: "9",  orders: 31, revenue: 1240000 },{ day: "11", orders: 28, revenue: 1120000 },
  { day: "13", orders: 22, revenue: 880000 }, { day: "15", orders: 35, revenue: 1400000 },
  { day: "17", orders: 42, revenue: 1680000 },{ day: "19", orders: 38, revenue: 1520000 },
  { day: "21", orders: 29, revenue: 1160000 },{ day: "23", orders: 45, revenue: 1800000 },
  { day: "25", orders: 52, revenue: 2080000 },{ day: "27", orders: 48, revenue: 1920000 },
  { day: "30", orders: 61, revenue: 2440000 },
];

function StatCard({ label, value, icon: Icon, color, sub, trend, trendVal }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trendVal && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${trend === "up" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            <ArrowUp className="w-3 h-3" /> {trendVal}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

const QUICK_ACTIONS = [
  { href: "/dashboard/vendors",  icon: Store,        label: "Vendor Management",   desc: "Approve, reject, suspend",          color: "bg-violet-50 text-violet-600" },
  { href: "/dashboard/orders",   icon: ShoppingBag,  label: "Order Management",    desc: "Platform-wide order tracking",      color: "bg-blue-50 text-blue-600"   },
  { href: "/dashboard/users",    icon: Users,        label: "User Management",      desc: "Customers, roles, bans",            color: "bg-emerald-50 text-emerald-600"},
  { href: "/dashboard/products", icon: Package,      label: "Product Moderation",  desc: "Review & approve listings",         color: "bg-amber-50 text-amber-600"  },
  { href: "/dashboard/kyc",      icon: CheckCircle,  label: "KYC Reviews",         desc: "NIN & CAC submissions",             color: "bg-cyan-50 text-cyan-600"    },
  { href: "/dashboard/finance",  icon: DollarSign,   label: "Financial Overview",  desc: "GMV, payouts, reconciliation",      color: "bg-rose-50 text-rose-600"    },
  { href: "/dashboard/analytics",icon: BarChart3,    label: "Analytics",           desc: "Traffic, conversion, revenue",      color: "bg-indigo-50 text-indigo-600"},
  { href: "/dashboard/marketing",icon: Zap,          label: "Marketing & Promo",   desc: "Promo codes, flash sales",          color: "bg-orange-50 text-orange-600"},
];

export default function AdminDashboardClient({ stats, adminName }) {
  const [tab, setTab] = useState("overview");

  const TABS = ["overview", "vendors", "users"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-gray-900 leading-tight">Admin Dashboard</p>
                <p className="text-xs text-gray-400">Welcome back, {adminName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.pendingKyc > 0 && (
                <Link href="/dashboard/kyc" className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3.5 py-2 rounded-full hover:bg-amber-100 transition-colors">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {stats.pendingKyc} KYC pending
                </Link>
              )}
              <Link href="/dashboard/settings" className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Platform GMV"     value={`₦${stats.gmv > 0 ? (stats.gmv / 1000000).toFixed(1) + "M" : "0"}`} icon={DollarSign}  color="bg-primary" trend="up" trendVal="+22%" />
          <StatCard label="Total Orders"     value={stats.totalOrders.toLocaleString()}    icon={ShoppingBag}  color="bg-blue-500"     sub={`${stats.pendingOrders} pending`}  />
          <StatCard label="Active Vendors"   value={stats.totalVendors.toLocaleString()}   icon={Store}        color="bg-emerald-500"  sub={stats.pendingKyc > 0 ? `${stats.pendingKyc} pending` : "All verified"} />
          <StatCard label="Registered Users" value={stats.totalUsers.toLocaleString()}     icon={Users}        color="bg-violet-500"   trend="up" trendVal="+18%" />
          <StatCard label="Live Products"    value={stats.totalProducts.toLocaleString()}  icon={Package}      color="bg-amber-500"    />
          <StatCard label="Pending KYC"      value={stats.pendingKyc.toLocaleString()}     icon={Clock}        color={stats.pendingKyc > 0 ? "bg-orange-500" : "bg-gray-400"} sub="Awaiting review" />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Revenue trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900">Revenue Trend (30d)</h2>
                <p className="text-sm text-gray-500">Daily GMV for the last 30 days</p>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /> +22% vs last month
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#560238" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#560238" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v) => [`₦${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#560238" strokeWidth={2.5} fill="url(#adminRevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform health */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Platform Health</h2>
            <div className="space-y-4">
              {[
                { label: "Order fulfillment", pct: 94, color: "bg-green-500" },
                { label: "Vendor approval",   pct: stats.pendingKyc === 0 ? 100 : Math.max(10, 100 - stats.pendingKyc * 10), color: "bg-blue-500" },
                { label: "Active listings",   pct: stats.totalProducts > 0 ? 88 : 0, color: "bg-violet-500" },
                { label: "Payment success",   pct: 98, color: "bg-emerald-500" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{m.label}</span>
                    <span className="font-bold text-gray-900">{m.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            <div className="mt-5 space-y-2">
              {stats.pendingKyc > 0 && (
                <Link href="/dashboard/kyc" className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 hover:bg-amber-100 transition-colors">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold">{stats.pendingKyc} vendor{stats.pendingKyc > 1 ? "s" : ""} awaiting KYC review</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              )}
              {stats.pendingOrders > 0 && (
                <Link href="/dashboard/orders" className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 hover:bg-blue-100 transition-colors">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">{stats.pendingOrders} orders need attention</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Management</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Recent registrations ────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Recent users */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Users</h2>
              <Link href="/dashboard/users" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No users yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{(u.email ?? "U")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${u.role === "vendor" ? "bg-violet-50 text-violet-700" : u.role === "admin" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent vendor applications */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Vendor Applications</h2>
              <Link href="/dashboard/vendors" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {stats.recentVendors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No vendor applications yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentVendors.map((v) => (
                  <div key={v.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.business_name}</p>
                      <p className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                      v.verification_status === "verified" ? "bg-green-50 text-green-700" :
                      v.verification_status === "pending"  ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {v.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
