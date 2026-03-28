"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Trash2, RefreshCw, X, Check } from "lucide-react";
import toast from "react-hot-toast";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

async function fetchShipping() {
  const r = await fetch("/api/vendor/shipping");
  return r.json();
}

function AddZoneForm({ existing, onAdd, saving }) {
  const [state,     setState]     = useState("");
  const [fee,       setFee]       = useState("0");
  const [freeAbove, setFreeAbove] = useState("");

  const existingStates = new Set(existing.map((z) => z.state));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!state) { toast.error("Select a state"); return; }
    onAdd({
      state,
      fee:        Number(fee) || 0,
      free_above: freeAbove !== "" ? Number(freeAbove) : null,
    });
    setState(""); setFee("0"); setFreeAbove("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Add Shipping Zone</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State *</label>
          <select value={state} onChange={(e) => setState(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100">
            <option value="">Select state…</option>
            {NIGERIAN_STATES.filter((s) => !existingStates.has(s)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Additional Fee (₦) <span className="font-normal text-gray-400">— 0 = platform rate</span>
          </label>
          <input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Free Shipping Above (₦) <span className="font-normal text-gray-400">— leave blank to disable</span>
          </label>
          <input type="number" min="0" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)}
            placeholder="e.g. 10000"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500" />
        </div>
      </div>
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors">
        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add Zone
      </button>
    </form>
  );
}

export default function VendorShippingPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-shipping"],
    queryFn: fetchShipping,
    staleTime: 60_000,
    retry: false,
  });

  const zones = data?.zones ?? [];

  const addMutation = useMutation({
    mutationFn: (payload) =>
      fetch("/api/vendor/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: () => {
      toast.success("Shipping zone saved");
      qc.invalidateQueries({ queryKey: ["vendor-shipping"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      fetch("/api/vendor/shipping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: () => {
      toast.success("Zone removed");
      qc.invalidateQueries({ queryKey: ["vendor-shipping"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Shipping Zones</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Set additional shipping fees per Nigerian state. Leave fee at ₦0 to use the platform default rate.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-4 text-sm text-blue-700 dark:text-blue-300">
        <strong>Note:</strong> The platform calculates a base delivery fee per state. Your rates here are <em>added on top</em> of the platform rate. Set ₦0 to use the platform rate as-is.
      </div>

      <AddZoneForm
        existing={zones}
        onAdd={(payload) => addMutation.mutate(payload)}
        saving={addMutation.isPending}
      />

      {/* Zones list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Configured Zones ({zones.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No custom zones yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Platform default rates apply to all states</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">State</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add. Fee</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Free Above</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {zones.map((z) => (
                  <tr key={z.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100">{z.state}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                      {z.fee === 0 ? <span className="text-green-600 dark:text-green-400">Platform rate</span> : `+₦${z.fee.toLocaleString()}`}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {z.free_above != null ? `₦${z.free_above.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(z.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
