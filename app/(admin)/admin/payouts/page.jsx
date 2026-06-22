"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, Check, RefreshCw, X, Crown, Gem, Package,
  CheckCircle2, XCircle, Clock, Mail, AlertTriangle,
  ArrowDownToLine, FileText,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = ["pending", "completed", "failed"];

const STATUS_CFG = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",   Icon: Clock         },
  completed: { label: "Completed", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",   Icon: CheckCircle2  },
  failed:    { label: "Failed",    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",               Icon: XCircle       },
};

const TIER_CFG = {
  vip:     { label: "VIP",     icon: Crown,   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  premium: { label: "Premium", icon: Gem,     cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"     },
  free:    { label: "Basic",   icon: Package, cls: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"        },
};

// ─── Badges ───────────────────────────────────────────────────────────────────

function TierBadge({ tier }) {
  const cfg  = TIER_CFG[tier] ?? TIER_CFG.free;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const c    = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = c.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

// ─── Resolve modal ────────────────────────────────────────────────────────────

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
              {payout.vendor.businessName || payout.vendor.name} · <span className="font-semibold text-gray-700 dark:text-gray-300">₦{payout.amount.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Payout summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2.5 text-sm">
              <Row label="Bank"    value={payout.bankName    ?? payout.vendor.bankAccount ?? "—"} />
              <Row label="Account" value={payout.bankAccount ?? payout.vendor.bankAccount ?? "—"} mono />
              <Row label="Amount"  value={`₦${payout.amount.toLocaleString()}`} bold />
              <Row label="Ref"     value={payout.reference} mono small />
            </div>

            {/* Action toggle */}
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Action</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "complete", label: "Mark Completed",  Icon: CheckCircle2, activeClass: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" },
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

            {/* Transfer reference — required for complete */}
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

            {/* Send email toggle — only for complete */}
            {action === "complete" && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setSendEmail((v) => !v)}
                  className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${sendEmail ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                  style={{ height: 22, width: 40 }}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> Email vendor confirmation
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sends a payout receipt to {payout.vendor.email}
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

function Row({ label, value, mono, bold, small }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      <span className={`text-right ${bold ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"} ${mono ? "font-mono text-xs" : ""} ${small ? "text-xs" : "text-sm"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Resolved detail popover ──────────────────────────────────────────────────

function ResolvedDetail({ payout }) {
  if (!payout.resolvedAt && !payout.transferReference) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {payout.transferReference && (
        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <FileText className="w-3 h-3 shrink-0" /> {payout.transferReference}
        </p>
      )}
      {payout.resolvedAtLabel && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{payout.resolvedAtLabel}</p>
      )}
      {payout.resolvedBy && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">by {payout.resolvedBy}</p>
      )}
      {payout.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{payout.notes}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [tab,     setTab]     = useState("pending");
  const [resolve, setResolve] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-payouts", tab],
    queryFn:  () => fetch(`/api/admin/payouts?status=${tab}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const payouts = data?.payouts ?? [];

  const resolveMutation = useMutation({
    mutationFn: async (payload) => {
      const r = await fetch("/api/admin/payouts", {
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
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vendor Payouts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review withdrawal requests and record manual bank transfers
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Priority note */}
      {tab === "pending" && payouts.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
          <Crown className="w-3.5 h-3.5 shrink-0" />
          VIP and Premium vendor payouts appear first. Process these manually via your bank, then mark as transferred here.
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No {tab} payouts</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Vendor withdrawal requests will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {payouts.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{p.vendor.businessName || p.vendor.name}</p>
                      <TierBadge tier={p.vendor.tier} />
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{p.vendor.email}</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{p.bankAccount ?? p.vendor.bankAccount}</p>
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5 truncate">{p.reference}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/60">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">₦{p.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.createdAt}</p>
                      <ResolvedDetail payout={p} />
                    </div>
                    {tab === "pending" && (
                      <button
                        onClick={() => setResolve(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-left bg-gray-50/60 dark:bg-gray-700/20">
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bank / Account</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {tab === "pending" ? "Requested" : "Resolved"}
                    </th>
                    {tab === "pending" && (
                      <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.vendor.businessName || p.vendor.name}</p>
                          <TierBadge tier={p.vendor.tier} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.vendor.email}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        ₦{p.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{p.bankName ?? "—"}</p>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.bankAccount ?? p.vendor.bankAccount ?? "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{p.reference}</p>
                        {p.transferReference && (
                          <p className="font-mono text-xs text-green-600 dark:text-green-400 mt-0.5 max-w-[150px] truncate">{p.transferReference}</p>
                        )}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-4 text-xs text-gray-400 dark:text-gray-500">
                        <p>{tab === "pending" ? p.createdAt : (p.resolvedAtLabel ?? p.createdAt)}</p>
                        {p.resolvedBy && <p className="mt-0.5">by {p.resolvedBy}</p>}
                        {p.notes && <p className="mt-0.5 italic text-gray-400 dark:text-gray-500 max-w-[140px] truncate">{p.notes}</p>}
                      </td>
                      {tab === "pending" && (
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setResolve(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Resolve
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
