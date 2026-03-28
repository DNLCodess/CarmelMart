"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, Users, Store, ShoppingCart, Package, Shield,
  AlertCircle, Clock, ArrowUp, ArrowDown, ShoppingBag, Tag,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import Link from "next/link";

async function fetchStats() {
  const r = await fetch("/api/admin/stats");
  return r.json();
}

const ORDER_PIE_FALLBACK = [
  { name: "Delivered", value: 58, color: "#10b981" },
  { name: "Pending",   value: 21, color: "#f59e0b" },
  { name: "Shipped",   value: 13, color: "#6366f1" },
  { name: "Cancelled", value: 8,  color: "#ef4444" },
];

const STATUS_COLOR = {
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  verified:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending_kyc: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function StatCard({ label, value, sub, icon: Icon, color, trend, trendValue, alert, href }) {
  const card = (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 flex items-start gap-4 transition-shadow hover:shadow-md ${alert ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10" : "border-gray-100 dark:border-gray-700"}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {trendValue && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
              {trend === "up" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {trendValue}
            </span>
          )}
          {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
    staleTime: 60_000,
    retry: false,
  });

  const s                   = data?.stats               ?? {};
  const revenueChart        = data?.revenue_chart        ?? [];
  const registrationsChart  = data?.registrations_chart  ?? [];
  const topCategories       = data?.top_categories       ?? [];
  const recentActivity      = data?.recent_activity      ?? [];
  const ordersByState       = data?.orders_by_state      ?? [];

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="GMV (30d)"       value={`₦${((s.gmv || 0) / 1000000).toFixed(1)}M`}          icon={DollarSign}   color="bg-primary"     trend="up"  trendValue="+18.2%"                     sub="gross revenue"      />
        <StatCard label="Total Users"     value={(s.total_users || 0).toLocaleString()}                  icon={Users}        color="bg-blue-500"    trend="up"  trendValue={`+${s.new_users_30d || 0}`} sub="new this month"     href="/admin/users"  />
        <StatCard label="Active Vendors"  value={(s.vendors || 0).toLocaleString()}                      icon={Store}        color="bg-violet-500"  sub={`${s.pending_kyc || 0} pending KYC`}  alert={(s.pending_kyc || 0) > 0}  href="/admin/kyc"    />
        <StatCard label="Total Orders"    value={(s.orders || 0).toLocaleString()}                       icon={ShoppingCart} color="bg-emerald-500" sub={`${s.pending_orders || 0} pending`}    href="/admin/orders" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Live Products"  value={(s.products || 0).toLocaleString()}      icon={Package}      color="bg-orange-500" />
        <StatCard label="Pending KYC"   value={(s.pending_kyc || 0).toLocaleString()}    icon={Shield}       color="bg-amber-500"  alert={(s.pending_kyc || 0) > 0}  href="/admin/kyc"    />
        <StatCard label="Open Disputes" value={(s.open_disputes || 0).toLocaleString()}  icon={AlertCircle}  color="bg-red-500"    alert={(s.open_disputes || 0) > 0} />
        <StatCard label="Pending Orders" value={(s.pending_orders || 0).toLocaleString()} icon={Clock}        color="bg-cyan-500"   href="/admin/orders" />
      </div>

      {/* Action alerts */}
      {((s.pending_kyc || 0) > 0 || (s.open_disputes || 0) > 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Action Required</p>
            <ul className="text-sm text-amber-700 dark:text-amber-400 mt-1 list-disc list-inside space-y-0.5">
              {(s.pending_kyc || 0) > 0   && <li>{s.pending_kyc} vendor KYC applications awaiting review — <Link href="/admin/kyc" className="font-bold underline">Review now</Link></li>}
              {(s.open_disputes || 0) > 0 && <li>{s.open_disputes} open disputes need resolution</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Revenue + Order status */}
      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Platform Revenue</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">6-month GMV trend</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Last 6 months</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#560238" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#560238" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => [`₦${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#560238" strokeWidth={2.5} fill="url(#adminRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Order Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Distribution today</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ORDER_PIE_FALLBACK} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                  {ORDER_PIE_FALLBACK.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {ORDER_PIE_FALLBACK.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Registrations + Top Categories */}
      <div className="grid xl:grid-cols-2 gap-5">
        {/* New registrations bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">New Registrations</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Daily signups — last 14 days</p>
          </div>
          <div className="h-48">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrationsChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, "New users"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {!isLoading && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right">
              Total: <span className="font-bold text-gray-700 dark:text-gray-300">
                {registrationsChart.reduce((s, d) => s + d.count, 0).toLocaleString()}
              </span> in 14 days
            </p>
          )}
        </div>

        {/* Top categories */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Top Categories</h3>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">by GMV · last 30 days</span>
          </div>
          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topCategories.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-gray-400 dark:text-gray-500">No sales data yet</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {topCategories.map((cat, i) => {
                const maxRev = topCategories[0]?.revenue || 1;
                const pct    = Math.round((cat.revenue / maxRev) * 100);
                return (
                  <div key={cat.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">₦{(cat.revenue / 1000).toFixed(0)}k</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{cat.orders} items</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Recent Activity</h3>
          <Link href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">View all orders</Link>
        </div>
        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center text-gray-400 dark:text-gray-500">No recent activity</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === "order" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-violet-100 dark:bg-violet-900/30"}`}>
                  {item.type === "order"
                    ? <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    : <Store className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.sub}</p>
                </div>
                <div className="text-right shrink-0">
                  {item.amount != null && (
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">₦{item.amount.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    {item.status && (
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold capitalize ${STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {item.status}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.timeAgo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders by state */}
      {ordersByState.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Orders by State</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Top 10 states — last 30 days</p>
          </div>
          <div style={{ height: ordersByState.length * 36 + 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={ordersByState}
                margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  formatter={(v, n) => [v, n === "orders" ? "Orders" : "Revenue"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="orders" fill="#560238" radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList dataKey="orders" position="right" style={{ fontSize: 11, fill: "#6b7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { href: "/admin/kyc",        label: "Review KYC",       color: "bg-amber-600"  },
          { href: "/admin/vendors",    label: "Manage Vendors",   color: "bg-violet-600" },
          { href: "/admin/orders",     label: "View Orders",      color: "bg-blue-600"   },
          { href: "/admin/users",      label: "Manage Users",     color: "bg-emerald-600"},
          { href: "/vendor/dashboard", label: "Switch to Vendor", color: "bg-gray-700"   },
          { href: "/",                 label: "View Store",        color: "bg-primary"    },
        ].map(({ href, label, color }) => (
          <Link
            key={href}
            href={href}
            className={`${color} text-white rounded-2xl p-4 text-xs font-bold text-center hover:opacity-90 transition-opacity leading-tight`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
