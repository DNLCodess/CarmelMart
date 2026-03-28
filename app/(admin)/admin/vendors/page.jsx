"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, Search, Check, XCircle, Ban, UserCheck, Eye,
  RefreshCw, Mail, Phone, CheckCircle, Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchVendors(params) {
  const r = await fetch(`/api/admin/vendors?${params}`);
  return r.json();
}

const VENDOR_STATUS_CFG = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"  },
  verified:  { label: "Verified",  cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"  },
  rejected:  { label: "Rejected",  cls: "bg-red-50   text-red-700   border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"    },
  suspended: { label: "Suspended", cls: "bg-gray-100 text-gray-600  border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"   },
};

function StatusBadge({ status }) {
  const c = VENDOR_STATUS_CFG[status] ?? VENDOR_STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, confirmCls, onConfirm, onCancel, withReason }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        {withReason && (
          <textarea
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm resize-none h-24 mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => onConfirm(reason)} className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors ${confirmCls}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVendorsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);
  const [confirm, setConfirm]           = useState(null);

  const params = new URLSearchParams({ status: statusFilter, page });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors", statusFilter, search, page],
    queryFn: () => fetchVendors(params.toString()),
    staleTime: 30_000,
    retry: false,
  });

  const { mutate: doAction, isPending } = useMutation({
    mutationFn: async ({ vendorId, action, reason }) => {
      const r = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      return d;
    },
    onSuccess: (_, { action }) => {
      toast.success(`Vendor ${action}d`);
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAction = (vendorId, action) => {
    if (action === "reject" || action === "suspend") {
      setConfirm({ vendorId, action });
    } else {
      doAction({ vendorId, action });
    }
  };

  const vendors = data?.vendors ?? [];
  const pages   = data?.pages   ?? 1;
  const total   = data?.total   ?? 0;

  const STATUS_TABS = ["all", "pending", "verified", "suspended", "rejected"];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Vendor Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} vendors registered</p>
        </div>
        <div className="sm:ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by business name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              statusFilter === s ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading vendors…</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-14 text-center">
            <Store className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Business</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">KYC</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{v.business_name}</p>
                          <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{v.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-gray-700 dark:text-gray-300">{v.email ?? "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{v.phone ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className={`text-xs font-bold ${v.nin_verified ? "text-green-600" : "text-gray-300 dark:text-gray-600"}`}>NIN</span>
                        <span className={`text-xs font-bold ${v.cac_verified ? "text-green-600" : "text-gray-300 dark:text-gray-600"}`}>CAC</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={v.verification_status} /></td>
                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {new Date(v.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/vendors/${v.id}`}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {v.verification_status === "pending" && (
                          <>
                            <button onClick={() => doAction({ vendorId: v.id, action: "approve" })} disabled={isPending}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleAction(v.id, "reject")}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {v.verification_status === "verified" && (
                          <button onClick={() => handleAction(v.id, "suspend")}
                            className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Suspend">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {v.verification_status === "suspended" && (
                          <button onClick={() => doAction({ vendorId: v.id, action: "unsuspend" })} disabled={isPending}
                            className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Reinstate">
                            <UserCheck className="w-4 h-4" />
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

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === "reject" ? "Reject Vendor?" : "Suspend Vendor?"}
        message={confirm?.action === "reject"
          ? "Their application will be rejected. They can re-apply after addressing the issues."
          : "Their products will be hidden from the store. Reversible at any time."}
        confirmLabel={confirm?.action === "reject" ? "Reject" : "Suspend"}
        confirmCls={confirm?.action === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
        withReason
        onConfirm={(reason) => doAction({ vendorId: confirm.vendorId, action: confirm.action, reason })}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
