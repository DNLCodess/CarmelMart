"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Check, RefreshCw, AlertCircle, X, Crown, Gem, Package } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_TABS = ["pending", "processing", "completed"];

const STATUS_CFG = {
  pending:    { label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  processing: { label: "Processing", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  completed:  { label: "Completed",  cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
};

const TIER_CFG = {
  vip:     { label: "VIP",     icon: Crown,   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  premium: { label: "Premium", icon: Gem,     cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  free:    { label: "Basic",   icon: Package, cls: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600" },
};

function TierBadge({ tier }) {
  const cfg = TIER_CFG[tier] ?? TIER_CFG.free;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function ConfirmModal({ payout, onClose, onConfirm, saving }) {
  if (!payout) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Approve Payout</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Vendor</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{payout.vendor.businessName || payout.vendor.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">₦{payout.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Account</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{payout.vendor.bankAccount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Reference</span>
            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{payout.reference}</span>
          </div>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          This will immediately trigger a Flutterwave bank transfer. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50">
            {saving ? "Processing…" : "Approve & Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-payouts", tab],
    queryFn: () => fetch(`/api/admin/payouts?status=${tab}`).then((r) => r.json()),
  });

  const payouts = data?.payouts ?? [];

  const approveMutation = useMutation({
    mutationFn: async (payoutId) => {
      const r = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Transfer failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Transfer initiated successfully");
      setConfirm(null);
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review and approve vendor withdrawal requests</p>
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
          VIP and Premium vendor payouts appear first.
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">Loading…</div>
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
            {/* ── Mobile card list (< lg) ─────────────────────────────────── */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {payouts.map((p) => (
                <div key={p.id} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{p.vendor.businessName || p.vendor.name}</p>
                      <TierBadge tier={p.vendor.tier} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{p.vendor.email}</p>
                  {p.vendor.bankAccount ? (
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{p.vendor.bankAccount}</p>
                  ) : (
                    <p className="text-xs text-red-500">No bank account</p>
                  )}
                  {p.reference && (
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5 truncate">{p.reference}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/60">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">₦{p.amount.toLocaleString()}</p>
                      {p.createdAt && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.createdAt}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      {tab === "pending" && (
                        <button
                          onClick={() => setConfirm(p)}
                          disabled={!p.vendor.bankAccount}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table (lg+) ─────────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bank Account</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Requested</th>
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
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">₦{p.amount.toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {p.vendor.bankAccount || <span className="text-red-500">No account</span>}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{p.reference}</td>
                      <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-4 text-xs text-gray-400 dark:text-gray-500">{p.createdAt}</td>
                      {tab === "pending" && (
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setConfirm(p)}
                            disabled={!p.vendor.bankAccount}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
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

      <ConfirmModal
        payout={confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => approveMutation.mutate(confirm.id)}
        saving={approveMutation.isPending}
      />
    </div>
  );
}
