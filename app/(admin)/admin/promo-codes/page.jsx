"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

async function fetchCodes() {
  const r = await fetch("/api/admin/promo-codes");
  return r.json();
}

function Badge({ active, expired }) {
  if (expired)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">Expired</span>;
  if (active)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Disabled</span>;
}

function CodeModal({ code, onClose, onSave, saving }) {
  const isEdit = !!code?.id;
  const [form, setForm] = useState(
    isEdit
      ? { active: code.active, max_uses: code.maxUses ?? "", expires_at: code.expiresAt ? code.expiresAt.slice(0, 16) : "" }
      : { code: "", type: "percentage", value: "", min_order: "", max_uses: "", expires_at: "" }
  );

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = isEdit
      ? { active: form.active, max_uses: form.max_uses, expires_at: form.expires_at }
      : { ...form, value: Number(form.value), min_order: form.min_order ? Number(form.min_order) : 0, max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at || null };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{isEdit ? "Edit Promo Code" : "Create Promo Code"}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Code *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₦)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Value * {form.type === "percentage" ? "(%)" : "(₦)"}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={form.type === "percentage" ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder={form.type === "percentage" ? "20" : "500"}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Min. Order Total (₦)</label>
                <input
                  type="number"
                  min="0"
                  value={form.min_order}
                  onChange={(e) => set("min_order", e.target.value)}
                  placeholder="0 (no minimum)"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </>
          )}

          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">Active</label>
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => set("max_uses", e.target.value)}
                placeholder="Unlimited"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Expires At</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => set("expires_at", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ code, onClose, onConfirm, saving }) {
  if (!code) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Delete Promo Code</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Delete <strong>{code.code}</strong>? This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
            {saving ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", code } | { mode: "delete", code }

  const { data, isLoading } = useQuery({ queryKey: ["admin-promo-codes"], queryFn: fetchCodes });
  const codes = data?.codes ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });

  const createMutation = useMutation({
    mutationFn: (body) => fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("Promo code created");
      setModal(null);
      invalidate();
    },
    onError: () => toast.error("Failed to create promo code"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => fetch(`/api/admin/promo-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("Promo code updated");
      setModal(null);
      invalidate();
    },
    onError: () => toast.error("Failed to update promo code"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("Promo code deleted");
      setModal(null);
      invalidate();
    },
    onError: () => toast.error("Failed to delete promo code"),
  });

  const handleSave = (payload) => {
    if (modal.mode === "create") {
      createMutation.mutate(payload);
    } else {
      editMutation.mutate({ id: modal.code.id, body: payload });
    }
  };

  const saving = createMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Promo Codes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create discount codes for customers</p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No promo codes yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create one to start offering discounts.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Code</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Discount</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Min Order</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Uses</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expires</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-gray-100 text-sm">{c.code}</td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      {c.type === "percentage" ? `${c.value}% off` : `₦${c.value.toLocaleString()} off`}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {c.minOrder > 0 ? `₦${c.minOrder.toLocaleString()}` : <span className="text-gray-400 dark:text-gray-500">—</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-xs">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                        : <span className="text-gray-400 dark:text-gray-500">Never</span>}
                    </td>
                    <td className="px-5 py-4"><Badge active={c.active} expired={c.expired} /></td>
                    <td className="px-5 py-4 text-xs text-gray-400 dark:text-gray-500">{c.createdAt}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModal({ mode: "edit", code: c })}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ mode: "delete", code: c })}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal?.mode === "create" || modal?.mode === "edit") && (
        <CodeModal
          key={modal?.code?.id ?? "new"}
          code={modal.mode === "edit" ? modal.code : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {modal?.mode === "delete" && (
        <DeleteConfirm
          code={modal.code}
          onClose={() => setModal(null)}
          onConfirm={() => deleteMutation.mutate(modal.code.id)}
          saving={saving}
        />
      )}
    </div>
  );
}
