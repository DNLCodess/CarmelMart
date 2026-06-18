"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent, Plus, Trash2, Edit2, Store, Tag, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

async function fetchCommission() {
  const r = await fetch("/api/admin/commission");
  return r.json();
}

function OverrideModal({ open, onClose, type, available, existingRate, existingNote, existingId, onSave, isSaving }) {
  const [targetId, setTargetId] = useState(existingId ?? "");
  const [rate,     setRate]     = useState(existingRate != null ? String(existingRate) : "");
  const [note,     setNote]     = useState(existingNote ?? "");
  const isEdit = existingId != null;

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const r = Number(rate);
    if (isNaN(r) || r < 0 || r > 100) { toast.error("Rate must be 0–100%"); return; }
    if (!isEdit && !targetId) { toast.error(`Select a ${type}`); return; }
    onSave({ type, target_id: isEdit ? existingId : targetId, rate: r, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
          {isEdit ? "Edit" : "Add"} {type === "vendor" ? "Vendor" : "Category"} Override
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {isEdit ? "Update the commission rate for this override." : `Set a custom commission rate that overrides the platform default.`}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {type === "vendor" ? "Vendor" : "Category"}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select {type === "vendor" ? "vendor" : "category"}…</option>
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {type === "vendor" ? `${item.businessName}${item.ownerName ? ` (${item.ownerName})` : ""}` : item.name}
                  </option>
                ))}
              </select>
              {available.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">All {type === "vendor" ? "vendors" : "categories"} already have overrides.</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Commission Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min={0}
                max={100}
                step="0.1"
                placeholder="e.g. 8"
                required
                className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Preferred partner — reduced rate"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-primary hover:opacity-90 disabled:opacity-50 rounded-xl transition-opacity">
              {isSaving ? "Saving…" : "Save Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ open, label, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">Remove Override?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          <span className="font-semibold">{label}</span> will revert to the platform default commission rate.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommissionPage() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState("vendor");
  const [modal, setModal]       = useState(null); // null | { mode: "add"|"edit", id?, rate?, note? }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, label }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-commission"],
    queryFn: fetchCommission,
    staleTime: 30_000,
    retry: false,
  });

  const defaultRate         = data?.defaultRate         ?? 10;
  const vendorOverrides     = data?.vendorOverrides     ?? [];
  const categoryOverrides   = data?.categoryOverrides   ?? [];
  const availableVendors    = data?.availableVendors    ?? [];
  const availableCategories = data?.availableCategories ?? [];

  const { mutate: saveOverride, isPending: saving } = useMutation({
    mutationFn: async ({ id, ...body }) => {
      if (id) {
        // Edit existing
        const r = await fetch(`/api/admin/commission/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Update failed");
        return d;
      }
      const r = await fetch("/api/admin/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Commission rate saved");
      qc.invalidateQueries({ queryKey: ["admin-commission"] });
      setModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: deleteOverride, isPending: deleting } = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/commission/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Delete failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Override removed");
      qc.invalidateQueries({ queryKey: ["admin-commission"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const overrides = tab === "vendor" ? vendorOverrides : categoryOverrides;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Commission Rates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform default: <span className="font-bold text-primary">{defaultRate}%</span>. Overrides below take precedence for specific vendors or categories.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Override
        </button>
      </div>

      {/* Default rate info card */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-center gap-3">
        <Percent className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          The platform charges vendors <span className="font-bold">{defaultRate}%</span> of each order total as commission. You can override this globally in{" "}
          <a href="/admin/settings" className="text-primary font-semibold hover:underline">Platform Settings</a>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {[
          { id: "vendor",   label: "Vendor Overrides",   icon: Store, count: vendorOverrides.length },
          { id: "category", label: "Category Overrides", icon: Tag,   count: categoryOverrides.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === id ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tab === id ? "bg-primary/10 text-primary" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Overrides table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        ) : overrides.length === 0 ? (
          <div className="p-12 text-center">
            <Percent className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">No {tab} overrides</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              All {tab === "vendor" ? "vendors" : "categories"} are using the default {defaultRate}% rate.
            </p>
            <button
              onClick={() => setModal({ mode: "add" })}
              className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add Override
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {overrides.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {tab === "vendor" ? r.businessName : r.name}
                      </p>
                      {tab === "vendor" && r.ownerName && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.ownerName}</p>
                      )}
                      {r.note && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{r.note}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold shrink-0 ${
                      r.rate < defaultRate
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : r.rate > defaultRate
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {r.rate}%
                      {r.rate < defaultRate && <span className="text-xs">▼</span>}
                      {r.rate > defaultRate && <span className="text-xs">▲</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/60">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModal({ mode: "edit", id: r.id, rate: r.rate, note: r.note })}
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: r.id, label: tab === "vendor" ? r.businessName : r.name })}
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {tab === "vendor" ? "Vendor" : "Category"}
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rate</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Note</th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {overrides.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {tab === "vendor" ? r.businessName : r.name}
                        </p>
                        {tab === "vendor" && r.ownerName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.ownerName}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                          r.rate < defaultRate
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : r.rate > defaultRate
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                          {r.rate}%
                          {r.rate < defaultRate && <span className="text-xs">▼</span>}
                          {r.rate > defaultRate && <span className="text-xs">▲</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                        {r.note || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setModal({ mode: "edit", id: r.id, rate: r.rate, note: r.note })}
                            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: r.id, label: tab === "vendor" ? r.businessName : r.name })}
                            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove override"
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

      {/* Add/Edit modal */}
      <OverrideModal
        open={!!modal}
        onClose={() => setModal(null)}
        type={tab}
        available={tab === "vendor" ? availableVendors : availableCategories}
        existingId={modal?.mode === "edit" ? modal.id : null}
        existingRate={modal?.mode === "edit" ? modal.rate : null}
        existingNote={modal?.mode === "edit" ? modal.note : null}
        onSave={(body) => saveOverride(modal?.mode === "edit" ? { id: modal.id, ...body } : body)}
        isSaving={saving}
      />

      {/* Delete confirm */}
      <DeleteConfirm
        open={!!deleteTarget}
        label={deleteTarget?.label}
        onConfirm={() => deleteOverride(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
