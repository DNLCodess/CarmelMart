"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, User, ShoppingBag, CreditCard, Gift, Store,
  RefreshCw, Phone, Mail, Wallet, Shield, CheckCircle, XCircle,
} from "lucide-react";

async function fetchUserDetail(id) {
  const r = await fetch(`/api/admin/users/${id}/detail`);
  return r.json();
}

const ROLE_CLS = {
  customer: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  vendor:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  admin:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

const STATUS_CLS = {
  active:    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  suspended: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  banned:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

const ORDER_STATUS_CLS = {
  pending:    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  confirmed:  "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  shipped:    "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  delivered:  "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  cancelled:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  refunded:   "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
};

function Badge({ text, cls }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {text}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AdminUserDetailPage({ params }) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn:  () => fetchUserDetail(id),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-64">
      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  );

  if (isError || !data?.user) return (
    <div className="text-center py-16">
      <p className="text-gray-500 dark:text-gray-400">User not found</p>
      <Link href="/admin/users" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>
    </div>
  );

  const { user, vendor, orders, payments, referrals } = data;

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">

      {/* Back */}
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-semibold transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Users
      </Link>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate">{user.name}</h2>
              <Badge text={user.role.charAt(0).toUpperCase() + user.role.slice(1)} cls={ROLE_CLS[user.role] ?? ""} />
              <Badge text={user.status.charAt(0).toUpperCase() + user.status.slice(1)} cls={STATUS_CLS[user.status] ?? ""} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{user.phone}</span>}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Member since {user.createdAt}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Orders",        value: user.stats.totalOrders,                              icon: ShoppingBag },
            { label: "Total Spent",   value: `₦${user.stats.totalSpent.toLocaleString()}`,        icon: CreditCard  },
            { label: "Wallet",        value: `₦${user.walletBalance.toLocaleString()}`,            icon: Wallet      },
            { label: "Referrals",     value: user.stats.referralsMade,                            icon: Gift        },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor profile */}
      {vendor && (
        <SectionCard title="Vendor Profile" icon={Store}>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Business Name</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{vendor.business_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Verification Status</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{vendor.verification_status}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1 text-xs font-semibold ${vendor.nin_verified ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {vendor.nin_verified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} NIN
              </span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${vendor.cac_verified ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {vendor.cac_verified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} CAC
              </span>
            </div>
            {vendor.bank_name && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Bank Account</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{vendor.bank_name} · {vendor.bank_account_number}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Orders */}
      <SectionCard title={`Recent Orders (${orders.length})`} icon={ShoppingBag}>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No orders</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{o.shortId}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ORDER_STATUS_CLS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">₦{(o.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400 dark:text-gray-500 hidden sm:table-cell">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Payments */}
      <SectionCard title={`Recent Payments (${payments.length})`} icon={CreditCard}>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No payments</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{p.reference}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 capitalize">{p.type}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold capitalize ${p.status === "completed" ? "text-green-600 dark:text-green-400" : p.status === "failed" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">₦{(p.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Referrals */}
      {referrals.length > 0 && (
        <SectionCard title={`Referrals Made (${referrals.length})`} icon={Gift}>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {referrals.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{r.name}</p>
                  {r.email && <p className="text-xs text-gray-400 dark:text-gray-500">{r.email}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold capitalize ${r.status === "completed" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {r.status}
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{r.date}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
