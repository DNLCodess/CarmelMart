"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Flag, XCircle, CheckCircle,
  ShoppingBag, Users, RefreshCw, CreditCard,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchFraudFlags() {
  const r = await fetch("/api/admin/fraud-flags");
  return r.json();
}

function FlagModal({ open, type, id, label, onClose, onConfirm, isSaving }) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Flag as Fraud</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Flag <span className="font-semibold">{label}</span> as suspicious. This will be visible to all admins.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Describe the reason for flagging…"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (!reason.trim()) { toast.error("Reason is required"); return; } onConfirm({ type, id, action: "flag", reason }); }}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {isSaving ? "Flagging…" : "Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, count, countColor, children, empty }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${countColor}`}>{count}</span>
      </div>
      {empty ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">{empty}</div>
      ) : children}
    </div>
  );
}

export default function FraudFlagsPage() {
  const qc = useQueryClient();
  const [flagModal, setFlagModal] = useState(null); // { type, id, label }
  const [tab, setTab] = useState("flagged");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fraud-flags"],
    queryFn: fetchFraudFlags,
    staleTime: 60_000,
    retry: false,
  });

  const flaggedOrders   = data?.flaggedOrders                    ?? [];
  const flaggedUsers    = data?.flaggedUsers                     ?? [];
  const failRisks       = data?.autoRisks?.highFailPayments      ?? [];

  const totalFlagged = flaggedOrders.length + flaggedUsers.length;
  const totalRisks   = failRisks.length;

  const { mutate: submitFlag, isPending: flagging } = useMutation({
    mutationFn: async (body) => {
      const r = await fetch("/api/admin/fraud-flags", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Action failed");
      return d;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "flag" ? "Flagged as fraud" : "Flag removed");
      qc.invalidateQueries({ queryKey: ["admin-fraud-flags"] });
      setFlagModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const unflag = (type, id, label) => {
    if (!confirm(`Remove fraud flag from ${label}?`)) return;
    submitFlag({ type, id, action: "unflag" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Fraud Flags</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manually flagged items and auto-detected risk indicators.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Flagged Orders",  value: flaggedOrders.length,  icon: ShoppingBag, color: "bg-red-500"    },
          { label: "Flagged Users",   value: flaggedUsers.length,   icon: Users,       color: "bg-red-600"    },
          { label: "High Fail Rate",  value: failRisks.length,      icon: CreditCard,  color: "bg-orange-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {[
          { id: "flagged",  label: "Manual Flags",     count: totalFlagged },
          { id: "risks",    label: "Auto-detected",    count: totalRisks   },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === id ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tab === id ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        </div>
      ) : tab === "flagged" ? (
        <div className="space-y-5">
          {/* Flagged orders */}
          <SectionCard
            title="Flagged Orders"
            icon={ShoppingBag}
            iconColor="bg-red-500"
            count={flaggedOrders.length}
            countColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            empty={flaggedOrders.length === 0 ? "No orders flagged yet" : null}
          >
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {flaggedOrders.map((o) => (
                <div key={o.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <Flag className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/orders`} className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary">
                        Order #{String(o.id).slice(0, 8).toUpperCase()}
                      </Link>
                      <span className="text-sm font-bold text-primary">₦{(o.total || 0).toLocaleString()}</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{o.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {o.customer?.name} · {o.customer?.email}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">"{o.reason}"</p>
                  </div>
                  <button
                    onClick={() => unflag("order", o.id, `Order #${String(o.id).slice(0, 8).toUpperCase()}`)}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                    title="Remove flag"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Flagged users */}
          <SectionCard
            title="Flagged Users"
            icon={Users}
            iconColor="bg-red-600"
            count={flaggedUsers.length}
            countColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            empty={flaggedUsers.length === 0 ? "No users flagged yet" : null}
          >
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {flaggedUsers.map((u) => (
                <div key={u.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <Flag className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/users/${u.id}`} className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary">
                        {u.name}
                      </Link>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                    </div>
                    {u.phone && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{u.phone}</p>}
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">"{u.reason}"</p>
                  </div>
                  <button
                    onClick={() => unflag("user", u.id, u.name || u.email)}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                    title="Remove flag"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-5">
          {/* High failed payments */}
          <SectionCard
            title="High Payment Failure Rate"
            icon={CreditCard}
            iconColor="bg-orange-500"
            count={failRisks.length}
            countColor="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            empty={failRisks.length === 0 ? "No users with 3+ failed payments in 30 days" : null}
          >
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {failRisks.map((u) => (
                <div key={u.userId} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <XCircle className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {u.failCount} failures
                    </span>
                    <button
                      onClick={() => setFlagModal({ type: "user", id: u.userId, label: u.name || u.email })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Flag className="w-3 h-3" /> Flag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {totalRisks === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-5 py-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">No auto-detected risks</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">No high payment failure rates detected.</p>
            </div>
          )}
        </div>
      )}

      <FlagModal
        open={!!flagModal}
        type={flagModal?.type}
        id={flagModal?.id}
        label={flagModal?.label}
        onClose={() => setFlagModal(null)}
        onConfirm={submitFlag}
        isSaving={flagging}
      />
    </div>
  );
}
