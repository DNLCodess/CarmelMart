"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame, Plus, Pencil, Trash2, X, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATE_CFG = {
  live:      { label: "Live",      cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", Icon: CheckCircle },
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",   Icon: Clock       },
  ended:     { label: "Ended",     cls: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600",       Icon: XCircle     },
  disabled:  { label: "Disabled",  cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",           Icon: XCircle     },
};

function StateBadge({ state }) {
  const c = STATE_CFG[state] ?? STATE_CFG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      <c.Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function SaleModal({ sale, onClose, onSave, saving }) {
  const isEdit = !!sale?.id;
  const [form, setForm] = useState(
    isEdit
      ? { title: sale.title, starts_at: toLocalInput(sale.startsAt), ends_at: toLocalInput(sale.endsAt), active: sale.active }
      : { title: "", description: "", discount_type: "percentage", discount_value: "", starts_at: "", ends_at: "" }
  );

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = isEdit
      ? { title: form.title, starts_at: form.starts_at, ends_at: form.ends_at, active: form.active }
      : { ...form, discount_value: Number(form.discount_value) };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{isEdit ? "Edit Flash Sale" : "Create Flash Sale"}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Weekend Mega Sale"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
                  placeholder="Optional tagline shown to customers"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Discount Type</label>
                  <select value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₦)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Value {form.discount_type === "percentage" ? "(%)" : "(₦)"}
                  </label>
                  <input required type="number" min="1" max={form.discount_type === "percentage" ? 100 : undefined}
                    value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)}
                    placeholder={form.discount_type === "percentage" ? "20" : "500"}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
                </div>
              </div>
            </>
          )}

          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">Active</label>
              <button type="button" onClick={() => set("active", !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Starts At *</label>
              <input required type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Ends At *</label>
              <input required type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FlashSalesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-flash-sales"],
    queryFn: () => fetch("/api/admin/flash-sales").then((r) => r.json()),
  });

  const sales = data?.sales ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-flash-sales"] });

  const createMutation = useMutation({
    mutationFn: (body) => fetch("/api/admin/flash-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => { if (d.error) { toast.error(d.error); return; } toast.success("Flash sale created"); setModal(null); invalidate(); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => fetch(`/api/admin/flash-sales/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => { if (d.error) { toast.error(d.error); return; } toast.success("Flash sale updated"); setModal(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`/api/admin/flash-sales/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (d) => { if (d.error) { toast.error(d.error); return; } toast.success("Flash sale deleted"); setModal(null); invalidate(); },
  });

  const saving = createMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  const handleSave = (payload) => {
    if (modal.mode === "create") createMutation.mutate(payload);
    else editMutation.mutate({ id: modal.sale.id, body: payload });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Flash Sales</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Schedule time-limited discount events</p>
        </div>
        <button onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> New Flash Sale
        </button>
      </div>

      {/* Sales grid */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">Loading…</div>
      ) : sales.length === 0 ? (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <Flame className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No flash sales yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create one to drive urgency and sales.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sales.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">{s.title}</p>
                </div>
                <StateBadge state={s.state} />
              </div>

              {s.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</p>
              )}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Discount</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {s.discountType === "percentage" ? `${s.discountValue}% off` : `₦${s.discountValue.toLocaleString()} off`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Starts</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(s.startsAt)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Ends</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(s.endsAt)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Products</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{s.productCount}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setModal({ mode: "edit", sale: s })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${s.title}"?`)) deleteMutation.mutate(s.id); }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal?.mode === "create" || modal?.mode === "edit") && (
        <SaleModal
          key={modal?.sale?.id ?? "new"}
          sale={modal.mode === "edit" ? modal.sale : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
