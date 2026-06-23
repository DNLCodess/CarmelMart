"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, RefreshCw, Wallet,
  CheckCircle, Clock, XCircle, SlidersHorizontal,
  Check, X, Mail, AlertTriangle, ArrowDownToLine, FileText,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "7d",  label: "7 Days"   },
  { value: "30d", label: "30 Days"  },
  { value: "90d", label: "90 Days"  },
  { value: "all", label: "All Time" },
];

const STATUSES = [
  { value: "",           label: "All"        },
  { value: "pending",    label: "Pending"    },
  { value: "completed",  label: "Completed"  },
  { value: "failed",     label: "Failed"     },
];

const STATUS_CLASSES = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS = {
  pending:   Clock,
  completed: CheckCircle,
  failed:    XCircle,
};

// ─── Resolve modal (shared with admin) ───────────────────────────────────────

function ResolveModal({ payout, onClose, onSubmit, saving }) {
  const [action,    setAction]    = useState("complete");
  const [ref,       setRef]       = useState("");
  const [notes,     setNotes]     = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  if (!payout) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === "complete" && !ref.trim()) {
      toast.error("Transfer reference is required");
      return;
    }
    onSubmit({ payoutId: payout.id, action, transferReference: ref, notes, sendEmail });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Resolve Payout</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {payout.vendor} · <span className="font-semibold text-gray-700 dark:text-gray-300">₦{payout.amount.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2.5 text-sm">
              {[
                { label: "Account Name",   value: payout.accountName,  mono: false },
                { label: "Account Number", value: payout.bankAccount,  mono: true  },
                { label: "Bank",           value: payout.bankName,     mono: false },
                { label: "Amount",         value: `₦${payout.amount.toLocaleString()}`, bold: true },
                { label: "Ref",            value: payout.reference,    mono: true, small: true },
              ].map(({ label, value, mono, bold, small }) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                  <span className={`text-right ${bold ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"} ${mono ? "font-mono text-xs" : ""} ${small ? "text-xs" : "text-sm"}`}>
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Action toggle */}
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Action</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "complete", label: "Mark Completed",  Icon: CheckCircle,  activeClass: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" },
                  { value: "reject",   label: "Reject & Refund", Icon: XCircle,      activeClass: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" },
                ].map(({ value, label, Icon, activeClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAction(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      action === value ? activeClass : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" /> {label}
                  </button>
                ))}
              </div>
              {action === "reject" && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Rejecting will refund ₦{payout.amount.toLocaleString()} to the vendor&apos;s wallet.
                </p>
              )}
            </div>

            {/* Transfer reference */}
            {action === "complete" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Bank Transfer Reference *
                </label>
                <input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. TRF2025061234567"
                  required
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-shadow"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Enter the reference from your bank after completing the transfer.
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Notes <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "reject" ? "Reason for rejection…" : "Any notes about this transfer…"}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-shadow resize-none"
              />
            </div>

            {/* Email toggle */}
            {action === "complete" && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setSendEmail((v) => !v)}
                  className={`relative rounded-full transition-colors cursor-pointer shrink-0 ${sendEmail ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                  style={{ height: 22, width: 40 }}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> Email vendor confirmation
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sends a payout receipt to {payout.vendorEmail}
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 ${
                action === "complete" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : action === "complete" ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {action === "complete" ? "Mark as Transferred" : "Reject & Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStrip({ summary, isLoading }) {
  const fmtN = (n) => `₦${(n ?? 0).toLocaleString()}`;
  const items = [
    { label: "Completed", value: fmtN(summary?.totalCompleted), colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle },
    { label: "Pending",   value: fmtN(summary?.totalPending),   colorClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",   icon: Clock       },
    { label: "Failed",    value: fmtN(summary?.totalFailed),    colorClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",               icon: XCircle     },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, colorClass }) => (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 flex flex-col gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
            {isLoading
              ? <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              : <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {status}
    </span>
  );
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{total} payouts total</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">{page} / {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountantPayoutsPage() {
  const qc = useQueryClient();
  const [range,   setRange]   = useState("30d");
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);
  const [resolve, setResolve] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["accountant-payouts", range, status, page],
    queryFn:  () => {
      const params = new URLSearchParams({ range, page });
      if (status) params.set("status", status);
      return fetch(`/api/accountant/payouts?${params}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load payouts");
        return r.json();
      });
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const payouts    = data?.payouts    ?? [];
  const summary    = data?.summary    ?? {};
  const pagination = data?.pagination ?? {};
  const fmtN       = (n) => `₦${(n ?? 0).toLocaleString()}`;

  const handleFilter = (setter) => (val) => { setter(val); setPage(1); };

  const resolveMutation = useMutation({
    mutationFn: async (payload) => {
      const r = await fetch("/api/accountant/payouts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Action failed");
      return d;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "complete" ? "Payout marked as transferred" : "Payout rejected — vendor refunded");
      setResolve(null);
      qc.invalidateQueries({ queryKey: ["accountant-payouts"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Vendor Payouts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Review withdrawal requests and record manual bank transfers
        </p>
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} isLoading={isLoading} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-2 items-center">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilter(setRange)(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                range === value
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilter(setStatus)(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                status === value
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isFetching && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />}
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 animate-pulse">
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-48 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
          ))
        ) : payouts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
            <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No payouts found</p>
          </div>
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.vendor}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.vendorEmail}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Amount</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5 text-base">{fmtN(p.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Account Name</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate">{p.accountName}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Account Number</p>
                  <p className="font-mono text-gray-700 dark:text-gray-300 mt-0.5">{p.bankAccount}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Bank</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate">{p.bankName}</p>
                </div>
                {p.reference && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500">Request Ref</p>
                    <p className="font-mono text-gray-600 dark:text-gray-400 mt-0.5 truncate">{p.reference}</p>
                  </div>
                )}
                {p.transferReference && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Transfer Ref</p>
                    <p className="font-mono text-green-600 dark:text-green-400 mt-0.5 truncate">{p.transferReference}</p>
                  </div>
                )}
                {p.resolvedBy && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500">Resolved by</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{p.resolvedBy} · {p.resolvedAtLabel}</p>
                  </div>
                )}
                {p.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500">Notes</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5 italic">{p.notes}</p>
                  </div>
                )}
                {p.error && (
                  <div className="col-span-2">
                    <p className="text-red-400">Error</p>
                    <p className="text-red-600 dark:text-red-400 mt-0.5 text-[11px]">{p.error}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/60">
                <div className="flex items-center gap-2">
                  <span>{p.date}</span>
                  {p.status === "pending" && (
                    <button
                      onClick={() => setResolve(p)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                    >
                      <Check className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
                {["Vendor", "Amount", "Status", "Account Name", "Account No.", "Bank", "Request Ref / Transfer Ref", "Resolved", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No payouts found
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{p.vendor}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{p.vendorEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtN(p.amount)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{p.accountName}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-400">{p.bankAccount}</td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{p.bankName}</td>
                    <td className="px-4 py-3.5">
                      {p.reference && (
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 max-w-[140px] truncate block">{p.reference}</span>
                      )}
                      {p.transferReference && (
                        <span className="font-mono text-xs text-green-600 dark:text-green-400 max-w-[140px] truncate flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3 shrink-0" /> {p.transferReference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {p.resolvedBy
                        ? <><p className="text-gray-700 dark:text-gray-300">{p.resolvedBy}</p><p className="text-gray-400 dark:text-gray-500">{p.resolvedAtLabel}</p></>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      {p.notes && <p className="text-gray-400 italic mt-0.5 max-w-[120px] truncate">{p.notes}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{p.date}</td>
                    <td className="px-4 py-3.5">
                      {p.status === "pending" && (
                        <button
                          onClick={() => setResolve(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{pagination.total} payouts total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">{pagination.page} / {pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ResolveModal
        payout={resolve}
        onClose={() => setResolve(null)}
        onSubmit={(payload) => resolveMutation.mutate(payload)}
        saving={resolveMutation.isPending}
      />
    </div>
  );
}
