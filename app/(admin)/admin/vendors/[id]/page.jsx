"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Store, Mail, Phone, Calendar, CheckCircle, Clock,
  Check, XCircle, Ban, UserCheck, RefreshCw, Package, ShoppingCart,
  Wallet, ArrowUp, ArrowDown, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const STATUS_CFG = {
  pending:   { label: "Pending Review", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"  },
  verified:  { label: "Verified",       cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"  },
  rejected:  { label: "Rejected",       cls: "bg-red-50   text-red-700   border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"    },
  suspended: { label: "Suspended",      cls: "bg-gray-100 text-gray-600  border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"   },
};

const ORDER_STATUS_CLS = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  shipped:   "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  delivered: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

export default function AdminVendorDetailPage({ params }) {
  const { id } = use(params);
  const qc     = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendor-detail", id],
    queryFn:  () => fetch(`/api/admin/vendors/${id}/detail`).then((r) => r.json()),
    enabled:  !!id,
    staleTime: 30_000,
  });

  const { mutate: doAction, isPending } = useMutation({
    mutationFn: async ({ action, reason }) => {
      const r = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      return d;
    },
    onSuccess: (_, { action }) => {
      toast.success(`Vendor ${action}d successfully`);
      qc.invalidateQueries({ queryKey: ["admin-vendor-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-spin" /></div>;
  }

  if (!data?.vendor) {
    return (
      <div className="text-center py-20">
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">Vendor not found</p>
        <Link href="/admin/vendors" className="text-sm text-primary underline">Back to vendors</Link>
      </div>
    );
  }

  const { vendor, products, stats, recentOrders, recentTransactions } = data;
  const status = vendor.verificationStatus;
  const cfg    = STATUS_CFG[status] ?? STATUS_CFG.pending;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/vendors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Vendors
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-bold text-gray-900 dark:text-gray-100 text-2xl">{vendor.businessName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>
              {vendor.subscriptionTier && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800 capitalize">
                  {vendor.subscriptionTier}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-600 dark:text-gray-400 mt-2">
              {vendor.user.email  && <span className="flex items-center gap-1.5"><Mail  className="w-4 h-4 text-gray-400" />{vendor.user.email}</span>}
              {vendor.user.phone  && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" />{vendor.user.phone}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />Joined {vendor.user.joinedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",   value: `₦${stats.totalRevenue.toLocaleString()}`,  icon: Wallet,       color: "text-primary"      },
          { label: "Total Orders",    value: stats.totalOrders,                           icon: ShoppingCart, color: "text-blue-600 dark:text-blue-400"    },
          { label: "Active Products", value: products.active,                             icon: Package,      color: "text-green-600 dark:text-green-400"  },
          { label: "Wallet Balance",  value: `₦${vendor.user.walletBalance.toLocaleString()}`, icon: Wallet, color: "text-violet-600 dark:text-violet-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* KYC + Products side by side */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* KYC */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">KYC Verification</h2>
          <div className="space-y-3">
            {[
              { label: "NIN Verification", sub: "National Identity Number", ok: vendor.ninVerified },
              { label: "CAC Registration", sub: vendor.cacNumber ?? "No CAC number", ok: vendor.cacVerified },
            ].map(({ label, sub, ok }) => (
              <div key={label} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{sub}</p>
                </div>
                {ok
                  ? <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4" /> Verified</span>
                  : <span className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-gray-500"><Clock className="w-4 h-4" /> Pending</span>}
              </div>
            ))}
            {vendor.user.podBlacklisted && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">POD Blacklisted — {vendor.user.podRefusedCount} refusals</p>
              </div>
            )}
          </div>
        </div>

        {/* Product breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Products</h2>
          <div className="space-y-2">
            {[
              { label: "Active",   value: products.active,   cls: "text-green-600 dark:text-green-400" },
              { label: "Draft",    value: products.draft,    cls: "text-gray-500 dark:text-gray-400"   },
              { label: "Inactive", value: products.inactive, cls: "text-red-500 dark:text-red-400"     },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`text-sm font-bold ${cls}`}>{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{products.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {recentOrders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders`} className="font-mono text-xs text-primary hover:underline">
                        #{o.orderId?.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs">{o.customer}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${ORDER_STATUS_CLS[o.status] ?? ""}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-gray-100">₦{o.total?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent wallet transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Wallet Activity</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentTransactions.map((t, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.type === "credit" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                  {t.type === "credit"
                    ? <ArrowDown className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    : <ArrowUp   className="w-3.5 h-3.5 text-red-600 dark:text-red-400"   />}
                </div>
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{t.description}</p>
                <p className={`text-sm font-bold shrink-0 ${t.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {t.type === "credit" ? "+" : "−"}₦{t.amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{t.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-bold text-gray-900 dark:text-gray-100">Admin Actions</h2>
        <div className="flex flex-wrap gap-3">
          {status === "pending" && (
            <>
              <button onClick={() => doAction({ action: "approve" })} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve Vendor
              </button>
              <button onClick={() => { const r = prompt("Rejection reason (optional):"); if (r !== null) doAction({ action: "reject", reason: r }); }} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                <XCircle className="w-4 h-4" /> Reject Application
              </button>
            </>
          )}
          {status === "verified" && (
            <button onClick={() => { const r = prompt("Suspension reason (optional):"); if (r !== null) doAction({ action: "suspend", reason: r }); }} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
              <Ban className="w-4 h-4" /> Suspend Vendor
            </button>
          )}
          {status === "suspended" && (
            <button onClick={() => doAction({ action: "unsuspend" })} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
              <UserCheck className="w-4 h-4" /> Reinstate Vendor
            </button>
          )}
          {status === "rejected" && (
            <button onClick={() => doAction({ action: "approve" })} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
              <Check className="w-4 h-4" /> Approve Anyway
            </button>
          )}
        </div>
        {isPending && <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating…</p>}
      </div>
    </div>
  );
}
