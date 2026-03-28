"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

async function fetchSettings() {
  const r = await fetch("/api/admin/settings");
  return r.json();
}

const SETTING_META = {
  referral_reward_ngn:   { label: "Referral Reward",           description: "NGN credited to referrer when a referred user completes vendor registration", prefix: "₦", type: "number" },
  platform_fee_percent:  { label: "Platform Fee",              description: "Percentage of each order total taken as the platform fee", suffix: "%", type: "number", max: 100 },
  pod_deposit_percent:   { label: "POD Deposit",               description: "Deposit percentage required for pay-on-delivery orders above the threshold", suffix: "%", type: "number", max: 100 },
  pod_deposit_threshold: { label: "POD Deposit Threshold",     description: "Minimum order total (NGN) that requires a POD deposit", prefix: "₦", type: "number" },
  min_withdrawal_ngn:    { label: "Min. Vendor Withdrawal",    description: "Minimum amount a vendor can withdraw from their wallet", prefix: "₦", type: "number" },
};

const SETTING_ORDER = [
  "platform_fee_percent",
  "referral_reward_ngn",
  "pod_deposit_percent",
  "pod_deposit_threshold",
  "min_withdrawal_ngn",
];

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettings });
  const settings = data?.settings ?? {};

  useEffect(() => {
    if (data?.settings) {
      const initial = {};
      for (const key of SETTING_ORDER) {
        initial[key] = data.settings[key]?.value ?? "";
      }
      setDraft(initial);
      setDirty(false);
    }
  }, [data]);

  const set = (key, value) => {
    setDraft((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: (updates) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("Settings saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const handleSave = () => {
    const updates = {};
    for (const key of SETTING_ORDER) {
      const original = String(settings[key]?.value ?? "");
      if (String(draft[key]) !== original) {
        updates[key] = draft[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      toast("No changes to save");
      return;
    }
    saveMutation.mutate(updates);
  };

  const handleDiscard = () => {
    if (!data?.settings) return;
    const initial = {};
    for (const key of SETTING_ORDER) {
      initial[key] = data.settings[key]?.value ?? "";
    }
    setDraft(initial);
    setDirty(false);
    toast("Changes discarded");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Platform Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure platform-wide fees and limits</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">Loading…</div>
        ) : (
          SETTING_ORDER.map((key) => {
            const meta = SETTING_META[key];
            if (!meta) return null;
            const info = settings[key];
            return (
              <div key={key} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{meta.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meta.description}</p>
                  {info?.updatedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Last updated{" "}
                      {new Date(info.updatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="sm:w-44">
                  <div className="relative">
                    {meta.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 dark:text-gray-400 pointer-events-none">
                        {meta.prefix}
                      </span>
                    )}
                    <input
                      type={meta.type}
                      min="0"
                      max={meta.max}
                      value={draft[key] ?? ""}
                      onChange={(e) => set(key, e.target.value)}
                      className={`w-full py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 ${
                        meta.prefix ? "pl-7 pr-4" : meta.suffix ? "pl-4 pr-7" : "px-4"
                      }`}
                    />
                    {meta.suffix && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 dark:text-gray-400 pointer-events-none">
                        {meta.suffix}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {dirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          You have unsaved changes
        </p>
      )}
    </div>
  );
}
