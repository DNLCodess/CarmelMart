"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, CheckCircle, Clock, Mail, Phone, Calendar,
  Check, XCircle, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

async function fetchPendingVendors() {
  const r = await fetch("/api/admin/vendors?status=pending&page=1");
  return r.json();
}

export default function AdminKYCPage() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-kyc-queue"],
    queryFn: fetchPendingVendors,
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
      qc.invalidateQueries({ queryKey: ["admin-kyc-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const vendors = data?.vendors ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">KYC Review Queue</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Vendor applications pending identity verification review
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading KYC queue…</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-12 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
          <p className="font-bold text-green-800 dark:text-green-400 text-lg">All clear!</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">No vendor applications are waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Vendor info */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{v.business_name}</h3>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {v.users?.email && (
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />{v.users.email}</span>
                      )}
                      {v.users?.phone && (
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />{v.users.phone}</span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        Applied {new Date(v.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* KYC details */}
                  <div className="flex flex-wrap gap-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${v.nin_verified ? "text-green-600" : "text-gray-400 dark:text-gray-500"}`}>
                        {v.nin_verified ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        NIN {v.nin_verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${v.cac_verified ? "text-green-600" : "text-gray-400 dark:text-gray-500"}`}>
                        {v.cac_verified ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        CAC {v.cac_verified ? "Verified" : "Pending"}
                        {v.cac_number ? ` — ${v.cac_number}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => doAction({ vendorId: v.id, action: "approve" })}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Rejection reason (will be sent to vendor):");
                      if (reason !== null) doAction({ vendorId: v.id, action: "reject", reason });
                    }}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
