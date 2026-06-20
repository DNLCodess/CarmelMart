"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, KeyRound, Trash2, UserCheck, UserX, RefreshCw, X, Eye, EyeOff,
  Calculator, Mail, ShieldCheck,
} from "lucide-react";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchAccountants() {
  const r = await fetch("/api/admin/accountants");
  if (!r.ok) throw new Error("Failed to load accountants");
  return r.json();
}

async function createAccountant(body) {
  const r = await fetch("/api/admin/accountants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Failed to create accountant");
  return d;
}

async function updateAccountant(id, body) {
  const r = await fetch(`/api/admin/accountants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

async function deleteAccountant(id) {
  const r = await fetch(`/api/admin/accountants/${id}`, { method: "DELETE" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Failed to delete");
  return d;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = status === "active"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder = "Password", label }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: createAccountant,
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(e.message),
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title="Create Accountant Account" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">First Name</label>
            <input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} placeholder="Jane" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Last Name</label>
            <input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} placeholder="Doe" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
          <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="accountant@carmelmart.com" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <PasswordInput label="Password (min. 8 characters)" value={form.password} onChange={set("password")} placeholder="Create a strong password" />
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        <button
          onClick={() => { setError(""); mutation.mutate(form); }}
          disabled={mutation.isPending || !form.email || !form.password}
          className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {mutation.isPending ? "Creating…" : "Create Account"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Reset password modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ accountant, onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (pw) => updateAccountant(accountant.id, { action: "reset_password", password: pw }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(e.message),
  });

  return (
    <Modal title={`Reset Password — ${accountant.email}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set a new password for this accountant. They will need to use it on their next login.
        </p>
        <PasswordInput label="New Password (min. 8 characters)" value={password} onChange={setPassword} placeholder="New password" />
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        <button
          onClick={() => { setError(""); mutation.mutate(password); }}
          disabled={mutation.isPending || password.length < 8}
          className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {mutation.isPending ? "Saving…" : "Update Password"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountantsPage() {
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-accountants"],
    queryFn: fetchAccountants,
    staleTime: 30_000,
  });

  const accountants = data?.accountants ?? [];

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) =>
      updateAccountant(id, { action: status === "active" ? "suspend" : "activate" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-accountants"] }),
    onError: (e) => setActionError(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteAccountant,
    onSuccess: () => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ["admin-accountants"] }); },
    onError: (e) => setActionError(e.message),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-accountants"] });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" /> Accountants
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage accounts with read-only access to financial data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Accountant
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Read-only financial access</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Accountants can view all financial data — orders, fees, payouts, and wallet activity — but cannot modify any records or take platform actions.
          </p>
        </div>
      </div>

      {/* Table / cards */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : accountants.length === 0 ? (
          <div className="p-12 text-center">
            <Calculator className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No accountants yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create the first accountant account to get started</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {accountants.map((a) => (
                <div key={a.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(a.first_name?.[0] ?? a.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                          {a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.email}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {a.email}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Created {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setResetTarget(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button
                      onClick={() => { setActionError(""); toggleStatus.mutate({ id: a.id, status: a.status }); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        a.status === "active"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100"
                      }`}
                    >
                      {a.status === "active" ? <><UserX className="w-3.5 h-3.5" /> Suspend</> : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Accountant</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {accountants.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(a.first_name?.[0] ?? a.email[0]).toUpperCase()}
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-400">{a.email}</td>
                      <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500">
                        {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResetTarget(a)}
                            title="Reset password"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setActionError(""); toggleStatus.mutate({ id: a.id, status: a.status }); }}
                            title={a.status === "active" ? "Suspend" : "Activate"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              a.status === "active"
                                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            }`}
                          >
                            {a.status === "active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-accountants"] })}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          accountant={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => {}}
        />
      )}
      {deleteTarget && (
        <Modal title="Delete Accountant" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-gray-100">{deleteTarget.email}</strong>? This cannot be undone.
            </p>
            {remove.error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{remove.error.message}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => remove.mutate(deleteTarget.id)}
                disabled={remove.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
