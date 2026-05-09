"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, X, Loader2, Truck, Phone, Mail, ShieldOff,
  ShieldCheck, Trash2, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchStaff = () =>
  fetch("/api/admin/logistics-staff").then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Failed to load");
    return d;
  });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  suspended: { label: "Suspended", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  banned:    { label: "Deactivated", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// ── Create staff modal ────────────────────────────────────────────────────────

const EMPTY = { first_name: "", last_name: "", email: "", phone: "", password: "" };

function CreateStaffModal({ onClose, onCreated }) {
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving]   = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = "Required.";
    if (!form.email.trim())      errs.email      = "Required.";
    if (!form.password)          errs.password   = "Required.";
    if (form.password && form.password.length < 8) errs.password = "Min 8 characters.";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/logistics-staff", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      toast.success("Logistics staff account created!");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Create Logistics Account</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" error={errors.first_name}>
              <input value={form.first_name} onChange={set("first_name")} placeholder="Emeka" className={inputCls(errors.first_name)} />
            </Field>
            <Field label="Last Name">
              <input value={form.last_name} onChange={set("last_name")} placeholder="Okafor" className={inputCls()} />
            </Field>
          </div>

          <Field label="Email Address *" error={errors.email}>
            <input type="email" value={form.email} onChange={set("email")} placeholder="emeka@carmelmart.ng" className={inputCls(errors.email)} />
          </Field>

          <Field label="Phone Number">
            <input value={form.phone} onChange={set("phone")} placeholder="08012345678" className={inputCls()} />
          </Field>

          <Field label="Password *" error={errors.password}>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min 8 characters"
                className={`${inputCls(errors.password)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            Share these credentials securely with the staff member. They can change their password after first login.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Deactivate confirmation ───────────────────────────────────────────────────

function DeactivateModal({ staff, onClose, onConfirm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Deactivate Account</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Permanently deactivate <strong>{staff.first_name} {staff.last_name}</strong>? This will block all future logins. If they have order history, the account is retained but disabled.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deactivate"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({ member, onSuspend, onReactivate, onDeactivate, loading }) {
  const cfg     = STATUS_CFG[member.status] ?? STATUS_CFG.active;
  const isBusy  = loading === member.id;
  const joined  = new Date(member.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 space-y-4 ${
      member.status === "active"
        ? "border-gray-100 dark:border-gray-700"
        : "border-red-100 dark:border-red-900/30 opacity-75"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
            member.status === "active" ? "bg-emerald-600" : "bg-gray-400 dark:bg-gray-600"
          }`}>
            {(member.first_name?.[0] ?? "?").toUpperCase()}{(member.last_name?.[0] ?? "").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Joined {joined}</p>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-gray-50 dark:border-gray-700 pt-3">
        {member.status === "active" ? (
          <button
            onClick={() => onSuspend(member)}
            disabled={isBusy}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
            Suspend
          </button>
        ) : member.status === "suspended" ? (
          <button
            onClick={() => onReactivate(member)}
            disabled={isBusy}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Reactivate
          </button>
        ) : null}

        {member.status !== "banned" && (
          <button
            onClick={() => onDeactivate(member)}
            disabled={isBusy}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error) {
  return `w-full px-4 py-2.5 text-sm border ${
    error
      ? "border-red-300 dark:border-red-700 focus:ring-red-300/30"
      : "border-gray-200 dark:border-gray-600 focus:ring-emerald-400/30"
  } rounded-xl focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LogisticsStaffPage() {
  const qc                                    = useQueryClient();
  const [showCreate,     setShowCreate]       = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [loadingId,      setLoadingId]        = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-logistics-staff"],
    queryFn:  fetchStaff,
    staleTime: 30_000,
    retry:    false,
  });

  const staff   = data?.staff ?? [];
  const active  = staff.filter((s) => s.status === "active").length;
  const suspended = staff.filter((s) => s.status === "suspended").length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-logistics-staff"] });

  const patchStatus = async (member, newStatus) => {
    setLoadingId(member.id);
    try {
      const r = await fetch(`/api/admin/logistics-staff/${member.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      toast.success(newStatus === "suspended" ? "Account suspended." : "Account reactivated.");
      invalidate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const deactivateMutation = useMutation({
    mutationFn: (id) =>
      fetch(`/api/admin/logistics-staff/${id}`, { method: "DELETE" }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: (res) => {
      toast.success(res.deactivated ? "Account deactivated (history preserved)." : "Account deleted.");
      setDeactivateTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Logistics Staff</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {staff.length} account{staff.length !== 1 ? "s" : ""} · {active} active
            {suspended > 0 ? ` · ${suspended} suspended` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Truck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Logistics staff accounts can log into the <strong>/logistics</strong> portal to manage order assignments and update delivery statuses.
          Suspended accounts are blocked from login until reactivated.
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Truck className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">No logistics staff yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Create an account so staff can log into the logistics portal.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Add First Staff
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              loading={loadingId}
              onSuspend={(m)      => patchStatus(m, "suspended")}
              onReactivate={(m)   => patchStatus(m, "active")}
              onDeactivate={(m)   => setDeactivateTarget(m)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateStaffModal
            key="create"
            onClose={() => setShowCreate(false)}
            onCreated={invalidate}
          />
        )}
        {deactivateTarget && (
          <DeactivateModal
            key="deactivate"
            staff={deactivateTarget}
            onClose={() => setDeactivateTarget(null)}
            onConfirm={() => deactivateMutation.mutate(deactivateTarget.id)}
            saving={deactivateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
