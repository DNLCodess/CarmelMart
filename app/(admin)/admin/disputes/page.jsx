"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, RefreshCw, X, CheckCircle, ThumbsUp, ThumbsDown, Eye,
} from "lucide-react";
import toast from "react-hot-toast";

async function fetchDisputes(params) {
  const r = await fetch(`/api/admin/disputes?${params}`);
  return r.json();
}

async function resolveDispute(id, action, resolution) {
  const r = await fetch(`/api/admin/disputes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, resolution }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed");
  return d;
}

const STATUS_CFG = {
  open:              { label: "Open",             cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"          },
  under_review:      { label: "Under Review",     cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  resolved_customer: { label: "Resolved (Buyer)", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
  resolved_vendor:   { label: "Resolved (Vendor)", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"     },
  closed:            { label: "Closed",           cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"        },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.open;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

const TABS = [
  { value: "",                 label: "All"          },
  { value: "open",             label: "Open"         },
  { value: "under_review",     label: "Under Review" },
  { value: "resolved_customer",label: "Resolved"     },
  { value: "closed",           label: "Closed"       },
];

function ResolveModal({ dispute, onClose, onConfirm, saving }) {
  const [action,     setAction]     = useState("side_customer");
  const [resolution, setResolution] = useState("");

  if (!dispute) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Resolve Dispute</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-1 text-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{dispute.order?.shortId ?? "—"} · ₦{(dispute.order?.total || 0).toLocaleString()}</p>
          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Buyer:</span> {dispute.customer.name}</p>
          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Vendor:</span> {dispute.vendor.businessName}</p>
          <p className="text-gray-600 dark:text-gray-400 mt-2 italic">"{dispute.reason}"</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Decision</p>
          {[
            { value: "side_customer", label: "Side with Buyer (refund order)", icon: ThumbsUp,   cls: "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" },
            { value: "side_vendor",   label: "Side with Vendor (no refund)",    icon: ThumbsDown, cls: "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" },
            { value: "close",         label: "Close without resolution",         icon: X,          cls: "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300" },
          ].map(({ value, label, icon: Icon, cls }) => (
            <label
              key={value}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${action === value ? cls : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"}`}
            >
              <input type="radio" name="action" value={value} checked={action === value} onChange={() => setAction(value)} className="sr-only" />
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">{label}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Resolution Note (shown to both parties)</label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            placeholder="Explain the decision…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dispute.id, action, resolution)}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Confirm Decision
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  const params = new URLSearchParams({ page });
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes", statusFilter, page],
    queryFn:  () => fetchDisputes(params.toString()),
    staleTime: 30_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ id, action, resolution }) => resolveDispute(id, action, resolution),
    onSuccess: (d) => {
      const labels = { resolved_customer: "Resolved — buyer wins", resolved_vendor: "Resolved — vendor wins", closed: "Dispute closed", under_review: "Marked under review" };
      toast.success(labels[d.status] ?? "Updated");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const markReview = (id) => mutation.mutate({ id, action: "review" });

  const disputes = data?.disputes ?? [];
  const pages    = data?.pages    ?? 1;
  const total    = data?.total    ?? 0;

  return (
    <div className="space-y-5">
      <ResolveModal
        dispute={modal}
        saving={mutation.isPending}
        onClose={() => setModal(null)}
        onConfirm={(id, action, resolution) => mutation.mutate({ id, action, resolution })}
      />

      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Disputes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} dispute{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === value ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading disputes…</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-14 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No disputes found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {disputes.map((d) => (
              <div key={d.id} className="px-5 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
                        {d.order?.shortId ?? "—"}
                      </span>
                      {d.order?.total && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ₦{d.order.total.toLocaleString()}
                        </span>
                      )}
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto sm:ml-0">{d.date}</span>
                    </div>

                    {/* Reason */}
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{d.reason}</p>
                    {d.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{d.description}</p>
                    )}

                    {/* Parties */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span><span className="font-semibold">Buyer:</span> {d.customer.name}</span>
                      <span><span className="font-semibold">Vendor:</span> {d.vendor.businessName}</span>
                    </div>

                    {/* Resolution note */}
                    {d.resolution && (
                      <p className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
                        Resolution: {d.resolution}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {(d.status === "open" || d.status === "under_review") && (
                    <div className="flex gap-2 shrink-0">
                      {d.status === "open" && (
                        <button
                          onClick={() => markReview(d.id)}
                          disabled={mutation.isPending}
                          title="Mark under review"
                          className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" /> Review
                        </button>
                      )}
                      <button
                        onClick={() => setModal(d)}
                        disabled={mutation.isPending}
                        className="p-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors flex items-center gap-1.5 px-3"
                      >
                        <CheckCircle className="w-4 h-4" /> Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
    </div>
  );
}
