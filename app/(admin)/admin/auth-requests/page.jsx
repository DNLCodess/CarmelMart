"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Loader2,
  AlertCircle, RefreshCw, X, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Data fetching ─────────────────────────────────────────────────────────────

const fetchRequests = (status) =>
  fetch(`/api/admin/auth-requests?status=${status}`).then((r) => r.json());

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",  icon: Clock         },
  approved: { label: "Approved", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",   icon: CheckCircle2  },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",               icon: XCircle       },
};

const OP_LABELS = {
  refund:           "Refund Request",
  payout_override:  "Payout Override",
  other:            "Other",
};

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({ req, onClose, onDecide, saving }) {
  const [action, setAction] = useState("approve");
  const [note,   setNote]   = useState("");
  const opData = req.operation_data ?? {};

  const isRefund = req.operation_type === "refund";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            Review: {OP_LABELS[req.operation_type] ?? req.operation_type}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Requester */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 space-y-1.5">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Request Details</p>
          <Row label="Requested by" value={opData.requester_name ?? req.requested_by_user?.email ?? "—"} />
          <Row label="Type" value={OP_LABELS[req.operation_type] ?? req.operation_type} />
          {isRefund && (
            <>
              <Row label="Order" value={opData.order_id ? `#CM-${opData.order_id.slice(0, 8).toUpperCase()}` : "—"} />
              <Row label="Amount" value={opData.amount ? `₦${Number(opData.amount).toLocaleString()}` : "—"} highlight />
              {opData.reason && <Row label="Reason" value={opData.reason} />}
            </>
          )}
          {req.operation_type === "other" && opData.description && (
            <Row label="Description" value={opData.description} />
          )}
          <Row
            label="Submitted"
            value={new Date(req.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
          />
        </div>

        {/* Action */}
        <div className="space-y-3 mb-5">
          <div className="flex gap-2">
            {["approve", "reject"].map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                  action === a
                    ? a === "approve"
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600"
                      : "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                {a === "approve" ? "Approve" : "Reject"}
              </button>
            ))}
          </div>

          {action === "approve" && isRefund && (
            <div className="flex items-start gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-400">
                Approving will immediately credit <strong>₦{Number(opData.amount ?? 0).toLocaleString()}</strong> to the customer's wallet and mark the order as refunded.
              </p>
            </div>
          )}

          {action === "reject" && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                The requester will be notified of the rejection. No action will be executed.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
              Review Note {action === "reject" ? "(required for rejection)" : "(optional)"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={action === "approve" ? "Internal note (optional)…" : "Reason for rejection…"}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onDecide({ id: req.id, action, review_note: note })}
            disabled={saving || (action === "reject" && !note.trim())}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
              action === "approve"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : action === "approve" ? "Approve & Execute" : "Reject Request"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-28 shrink-0">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"} flex-1`}>
        {value}
      </span>
    </div>
  );
}

// ── Request row ───────────────────────────────────────────────────────────────

function RequestRow({ req, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
  const StatusIcon = cfg.icon;
  const opData = req.operation_data ?? {};

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          req.status === "approved" ? "bg-green-100 dark:bg-green-900/30" :
          req.status === "rejected" ? "bg-red-100 dark:bg-red-900/30" :
          "bg-amber-100 dark:bg-amber-900/30"
        }`}>
          <StatusIcon className={`w-4 h-4 ${
            req.status === "approved" ? "text-green-600 dark:text-green-400" :
            req.status === "rejected" ? "text-red-500 dark:text-red-400" :
            "text-amber-600 dark:text-amber-400"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {OP_LABELS[req.operation_type] ?? req.operation_type}
            </p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            By {opData.requester_name ?? req.requested_by_user?.email ?? "—"} ·{" "}
            {new Date(req.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {req.operation_type === "refund" && opData.amount && (
          <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 shrink-0">
            ₦{Number(opData.amount).toLocaleString()}
          </p>
        )}

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-gray-50 dark:border-gray-700 pt-3 space-y-2">
              {req.operation_type === "refund" && (
                <>
                  {opData.order_id && (
                    <Row label="Order" value={`#CM-${opData.order_id.slice(0, 8).toUpperCase()}`} />
                  )}
                  {opData.reason && <Row label="Reason" value={opData.reason} />}
                </>
              )}
              {req.operation_type === "other" && opData.description && (
                <Row label="Description" value={opData.description} />
              )}
              {req.notes && (
                <Row label="Review note" value={req.notes} />
              )}
              {req.executed_at && (
                <Row
                  label="Executed at"
                  value={new Date(req.executed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                />
              )}

              {req.status === "pending" && (
                <div className="pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReview(req); }}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors"
                  >
                    Review & Decide
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all",      label: "All"      },
];

export default function AdminAuthRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reviewing,    setReviewing]    = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-auth-requests", statusFilter],
    queryFn:  () => fetchRequests(statusFilter),
    staleTime: 15_000,
    retry:    false,
  });

  const requests = data?.requests ?? [];
  const pending  = requests.filter((r) => r.status === "pending").length;

  const decideMutation = useMutation({
    mutationFn: (body) =>
      fetch("/api/admin/auth-requests", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Decision failed");
        return d;
      }),
    onSuccess: (_, { action }) => {
      toast.success(action === "approve" ? "Request approved and executed." : "Request rejected.");
      setReviewing(null);
      qc.invalidateQueries({ queryKey: ["admin-auth-requests"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Authorization Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Sensitive operations submitted by admins for your approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusFilter === "pending" && pending > 0 && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
              {pending} pending
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === value
                ? "bg-white dark:bg-gray-600 text-primary shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <ShieldCheck className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 dark:text-gray-400">
            {statusFilter === "pending" ? "No pending requests" : "No requests found"}
          </p>
          {statusFilter === "pending" && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Logistics admins' sensitive operation requests will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestRow key={req.id} req={req} onReview={setReviewing} />
          ))}
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewing && (
          <ReviewModal
            key={reviewing.id}
            req={reviewing}
            onClose={() => setReviewing(null)}
            onDecide={(body) => decideMutation.mutate(body)}
            saving={decideMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
