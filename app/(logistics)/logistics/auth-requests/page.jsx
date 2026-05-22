"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Plus, RefreshCw, X, AlertCircle,
  CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchRequests() {
  const r = await fetch("/api/logistics/auth-requests");
  if (!r.ok) throw new Error("Failed to load requests");
  return r.json();
}

async function submitRequest(body) {
  const r = await fetch("/api/logistics/auth-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Submission failed");
  return d;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: "Pending",  icon: Clock,         cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"  },
  approved: { label: "Approved", icon: CheckCircle2,  cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
  rejected: { label: "Rejected", icon: XCircle,       cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"             },
};

const TYPE_LABELS = {
  refund:          "Refund",
  payout_override: "Payout Override",
  other:           "Other",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({ req }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(req.created_at).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {TYPE_LABELS[req.operation_type] ?? req.operation_type}
            </span>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-3">
              {/* Operation data */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 text-xs font-mono text-gray-600 dark:text-gray-300 space-y-1">
                {Object.entries(req.operation_data ?? {})
                  .filter(([k]) => !["requester_name", "requester_email"].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-400 dark:text-gray-500 shrink-0">{k}:</span>
                      <span className="break-all">{String(v)}</span>
                    </div>
                  ))}
              </div>
              {/* Review notes from super admin */}
              {req.notes && (
                <div className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p><span className="font-semibold">Admin note:</span> {req.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Submit modal ──────────────────────────────────────────────────────────────

function SubmitModal({ onClose, onSuccess }) {
  const [type, setType]   = useState("refund");
  const [form, setForm]   = useState({ order_id: "", amount: "", reason: "", description: "" });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: submitRequest,
    onSuccess: () => {
      toast.success("Request submitted. Awaiting super admin review.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (type === "refund") {
      if (!form.order_id.trim()) errs.order_id = "Order ID is required";
      if (!form.amount || Number(form.amount) <= 0) errs.amount = "Valid amount required";
      if (!form.reason.trim()) errs.reason = "Reason is required";
    } else {
      if (!form.description.trim()) errs.description = "Description is required";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const operation_data = type === "refund"
      ? { order_id: form.order_id.trim(), amount: Number(form.amount), reason: form.reason.trim() }
      : { description: form.description.trim() };

    mutation.mutate({ operation_type: type, operation_data });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">New Authorization Request</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Requests require super admin approval before any action is taken.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Request Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="refund">Refund</option>
              <option value="payout_override">Payout Override</option>
              <option value="other">Other</option>
            </select>
          </div>

          {type === "refund" ? (
            <>
              <Field label="Order ID" error={errors.order_id}>
                <input value={form.order_id} onChange={set("order_id")} placeholder="Order UUID" className={inputCls(errors.order_id)} />
              </Field>
              <Field label="Refund Amount (₦)" error={errors.amount}>
                <input type="number" min="1" value={form.amount} onChange={set("amount")} placeholder="e.g. 5000" className={inputCls(errors.amount)} />
              </Field>
              <Field label="Reason" error={errors.reason}>
                <textarea rows={3} value={form.reason} onChange={set("reason")} placeholder="Explain why a refund is needed..." className={inputCls(errors.reason)} />
              </Field>
            </>
          ) : (
            <Field label="Description" error={errors.description}>
              <textarea rows={4} value={form.description} onChange={set("description")} placeholder="Describe the operation and why it needs admin authorization..." className={inputCls(errors.description)} />
            </Field>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              {mutation.isPending ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function inputCls(error) {
  return `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-gray-100 ${
    error
      ? "border-red-300 dark:border-red-500 focus:ring-red-500/20"
      : "border-gray-200 dark:border-gray-600 focus:ring-primary/30"
  }`;
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LogisticsAuthRequestsPage() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["logistics-auth-requests"],
    queryFn:  fetchRequests,
    staleTime: 30_000,
    retry: false,
  });

  const requests = data?.requests ?? [];
  const pending  = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Authorization requests sent to super admin
            {pending > 0 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{pending} pending</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-red-500 dark:text-red-400 text-sm">Failed to load requests.</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">No requests yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Submit a request when you need super admin authorization.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => <RequestCard key={req.id} req={req} />)}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <SubmitModal
            onClose={() => setShowModal(false)}
            onSuccess={() => qc.invalidateQueries({ queryKey: ["logistics-auth-requests"] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
