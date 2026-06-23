"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Pencil, Check, RefreshCw, Tag } from "lucide-react";
import toast from "react-hot-toast";

const DIMENSIONS = [
  { value: "size",    label: "Sizes"    },
  { value: "color",   label: "Colours"  },
  { value: "storage", label: "Storage"  },
];

const dimLabel = (d) => DIMENSIONS.find((x) => x.value === d)?.label ?? d;

async function fetchPresets() {
  const r = await fetch("/api/vendor/variant-presets");
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed to load presets");
  return d.presets ?? [];
}

// ── Reusable value chip editor ──────────────────────────────────────────────
function ValueChips({ values, onChange }) {
  const [input, setInput] = useState("");

  const add = () => {
    // Allow comma- or space-separated bulk entry
    const parts = input.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setInput("");
  };

  const remove = (v) => onChange(values.filter((x) => x !== v));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border-2 border-primary bg-primary/10 text-primary"
          >
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Nothing added yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder="Type one and press Enter (e.g. 28)"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-sm font-semibold text-primary border-2 border-primary/30 rounded-xl hover:bg-primary/10 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Create / edit form ──────────────────────────────────────────────────────
function PresetEditor({ initial, onSave, onCancel, saving }) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [dimension, setDimension] = useState(initial?.dimension ?? "size");
  const [values, setValues]       = useState(initial?.values ?? []);
  const isEdit = !!initial?.id;

  const submit = () => {
    if (!name.trim()) { toast.error("Please name your list"); return; }
    if (values.length === 0) { toast.error("Add at least one item"); return; }
    onSave({ id: initial?.id, name: name.trim(), dimension, values });
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-3 bg-gray-50/60 dark:bg-gray-700/30">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">List name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Jeans Sizes"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">This list is for</label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            disabled={isEdit}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60"
          >
            {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Items in the list</label>
        <ValueChips values={values} onChange={setValues} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-primary rounded-full hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isEdit ? "Save changes" : "Save list"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main manager ────────────────────────────────────────────────────────────
export default function VariantPresetsManager() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["vendor-variant-presets"],
    queryFn: fetchPresets,
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["vendor-variant-presets"] });

  const createMut = useMutation({
    mutationFn: async ({ name, dimension, values }) => {
      const r = await fetch("/api/vendor/variant-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dimension, values }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to create preset");
      return d;
    },
    onSuccess: () => { toast.success("List saved"); setCreating(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, name, values }) => {
      const r = await fetch("/api/vendor/variant-presets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, values }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update preset");
      return d;
    },
    onSuccess: () => { toast.success("List saved"); setEditingId(null); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/vendor/variant-presets?id=${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to delete preset");
      return d;
    },
    onSuccess: () => { toast.success("List deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" /> Your Saved Lists
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Make your own lists of sizes, colours or storage once. Then add them to any
          product with one tap — no need to type them again.
        </p>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {presets.length === 0 && !creating && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              You have no lists yet.
            </p>
          )}

          {presets.map((p) =>
            editingId === p.id ? (
              <PresetEditor
                key={p.id}
                initial={p}
                saving={updateMut.isPending}
                onSave={(payload) => updateMut.mutate(payload)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.name}</p>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {dimLabel(p.dimension)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(p.values ?? []).map((v) => (
                      <span key={v} className="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingId(p.id); setCreating(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label="Edit list"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete the list "${p.name}"?`)) deleteMut.mutate(p.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Delete list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}

          {creating ? (
            <PresetEditor
              saving={createMut.isPending}
              onSave={(payload) => createMut.mutate(payload)}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => { setCreating(true); setEditingId(null); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary border-2 border-dashed border-primary/30 rounded-xl hover:bg-primary/5 transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Add a new list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
