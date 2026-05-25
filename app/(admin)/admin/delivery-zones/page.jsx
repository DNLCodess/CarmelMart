"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Pencil, Trash2, RefreshCw, X, Check, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

async function fetchZones() {
  const r = await fetch("/api/admin/delivery-zones");
  return r.json();
}

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

function ZoneModal({ open, initial, onClose, onSave, saving }) {
  const [state,    setState]    = useState(initial?.state          ?? "");
  const [lga,      setLga]      = useState(initial?.lga            ?? "");
  const [baseFee,  setBaseFee]  = useState(initial?.base_fee       ?? 0);
  const [kgFee,    setKgFee]    = useState(initial?.per_kg_fee     ?? 0);
  const [eta,      setEta]      = useState(initial?.estimated_days ?? 3);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!state) { toast.error("Select a state"); return; }
    onSave({ state, lga: lga.trim() || null, base_fee: Number(baseFee), per_kg_fee: Number(kgFee), estimated_days: Number(eta) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{initial ? "Edit Zone" : "Add Delivery Zone"}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State *</label>
              <select value={state} onChange={(e) => setState(e.target.value)} required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100">
                <option value="">Select…</option>
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">LGA (optional)</label>
              <input value={lga} onChange={(e) => setLga(e.target.value)} placeholder="Applies to whole state if empty"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Base Fee (₦)</label>
              <input type="number" min="0" value={baseFee} onChange={(e) => setBaseFee(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Per-kg Fee (₦)</label>
              <input type="number" min="0" value={kgFee} onChange={(e) => setKgFee(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Est. Days</label>
              <input type="number" min="1" max="30" value={eta} onChange={(e) => setEta(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {initial ? "Save" : "Add Zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDeliveryZonesPage() {
  const qc = useQueryClient();
  const [modal,   setModal]   = useState(null); // null | { mode: "create" } | { mode: "edit", zone }
  const [delId,   setDelId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery-zones"],
    queryFn: fetchZones,
    staleTime: 60_000,
    retry: false,
  });

  const zones = data?.zones ?? [];

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const url    = id ? `/api/admin/delivery-zones/${id}` : "/api/admin/delivery-zones";
      const method = id ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Zone saved");
      qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      setModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      const r = await fetch(`/api/admin/delivery-zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update zone");
      return d;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] }),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/delivery-zones/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to delete zone");
      return d;
    },
    onSuccess: () => {
      toast.success("Zone deleted");
      qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      setDelId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Group by state
  const byState = {};
  zones.forEach((z) => {
    if (!byState[z.state]) byState[z.state] = [];
    byState[z.state].push(z);
  });
  const stateKeys = Object.keys(byState).sort();

  return (
    <div className="space-y-5">
      <ZoneModal
        key={modal?.zone?.id ?? "new"}
        open={!!modal}
        initial={modal?.zone}
        saving={saveMutation.isPending}
        onClose={() => setModal(null)}
        onSave={(payload) => saveMutation.mutate({ id: modal?.zone?.id, payload })}
      />

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Delete Zone?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
              <button onClick={() => deleteMutation.mutate(delId)} disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Delivery Zones</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{zones.length} zone{zones.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading zones…</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="p-14 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Truck className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 dark:text-gray-400">No delivery zones yet</p>
          <button onClick={() => setModal({ mode: "create" })} className="mt-3 text-sm text-primary hover:underline font-semibold">
            Add your first zone
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stateKeys.map((state) => (
            <div key={state} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{state}</p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {byState[state].map((z) => (
                  <div key={z.id} className={`px-5 py-3.5 flex items-center gap-4 ${z.active ? "" : "opacity-50"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {z.lga ?? <span className="italic text-gray-400 dark:text-gray-500">All LGAs</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Base ₦{z.base_fee.toLocaleString()} · Per-kg ₦{z.per_kg_fee.toLocaleString()} · {z.estimated_days}d ETA
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleMutation.mutate({ id: z.id, active: !z.active })}
                        title={z.active ? "Disable" : "Enable"}
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        {z.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setModal({ mode: "edit", zone: z })}
                        title="Edit"
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDelId(z.id)}
                        title="Delete"
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
