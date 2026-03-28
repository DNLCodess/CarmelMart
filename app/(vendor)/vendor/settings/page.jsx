"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg border-b border-gray-100 dark:border-gray-700 pb-4">{title}</h2>
      {children}
    </div>
  );
}

async function fetchSettings() {
  const r = await fetch("/api/vendor/settings");
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed to load settings");
  return d;
}

async function saveSettings(data) {
  const r = await fetch("/api/vendor/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Save failed");
  return d;
}

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
    retry: false,
  });

  const settings = data?.settings ?? {};

  // ── Shop profile form ──────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (settings.id) {
      reset({
        business_name: settings.business_name ?? "",
        description:   settings.description   ?? "",
        phone:         settings.phone          ?? "",
        city:          settings.city           ?? "",
        state:         settings.state          ?? "Lagos",
        return_policy: settings.return_policy  ?? "Returns accepted within 7 days of delivery in original condition.",
      });
    }
  }, [settings.id]); // eslint-disable-line

  const { mutate: saveProfile } = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      toast.success("Shop settings saved");
      qc.invalidateQueries({ queryKey: ["vendor-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Bank account form ──────────────────────────────────────────────────────
  const {
    register: regBank,
    handleSubmit: handleBank,
    reset: resetBank,
    formState: { isSubmitting: bankSubmitting, isDirty: bankDirty },
  } = useForm();

  useEffect(() => {
    if (settings.id) {
      resetBank({
        bank_name:           settings.bank_name           ?? "",
        bank_account_number: settings.bank_account_number ?? "",
        bank_code:           settings.bank_code           ?? "",
      });
    }
  }, [settings.id]); // eslint-disable-line

  const { mutate: saveBank } = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      toast.success("Bank details updated");
      qc.invalidateQueries({ queryKey: ["vendor-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Vacation mode ──────────────────────────────────────────────────────────
  const [vacationMode, setVacationMode] = useState(false);

  useEffect(() => {
    if (settings.id) setVacationMode(!!settings.vacation_mode);
  }, [settings.id, settings.vacation_mode]);

  const { mutate: toggleVacation, isPending: vacationPending } = useMutation({
    mutationFn: (v) => saveSettings({ vacation_mode: v }),
    onSuccess: (_, v) => {
      toast.success(v ? "Vacation mode enabled — your products are hidden" : "Vacation mode disabled");
      qc.invalidateQueries({ queryKey: ["vendor-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Password change ────────────────────────────────────────────────────────
  const {
    register: regPw,
    handleSubmit: handlePw,
    watch: watchPw,
    reset: resetPw,
    formState: { isSubmitting: pwSubmitting },
  } = useForm();

  const onChangePassword = async (formData) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;
      resetPw();
      toast.success("Password updated");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop profile */}
      <Section title="Shop Profile">
        <form onSubmit={handleSubmit((d) => saveProfile(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Shop Name</label>
            <input
              {...register("business_name")}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Shop Bio</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Tell customers about your store…"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Business Phone</label>
              <input
                {...register("phone")}
                type="tel"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">City</label>
              <input
                {...register("city")}
                placeholder="e.g. Lagos"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State</label>
            <select
              {...register("state")}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Return Policy</label>
            <textarea
              {...register("return_policy")}
              rows={3}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            {isSubmitting ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </Section>

      {/* Bank account */}
      <Section title="Bank Account">
        <p className="text-sm text-gray-500 dark:text-gray-400">Your payouts will be sent to this account.</p>
        <form onSubmit={handleBank((d) => saveBank(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bank Name</label>
            <input
              {...regBank("bank_name")}
              placeholder="e.g. First Bank of Nigeria"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Account Number</label>
            <input
              {...regBank("bank_account_number")}
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit NUBAN"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={bankSubmitting || !bankDirty}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {bankSubmitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            {bankSubmitting ? "Saving…" : "Save Bank Details"}
          </button>
        </form>
      </Section>

      {/* Vacation mode */}
      <Section title="Vacation Mode">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Enable Vacation Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Hides all your products from the store while you're away. Orders already placed are not affected.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={vacationMode}
              disabled={vacationPending}
              onChange={(e) => {
                const v = e.target.checked;
                setVacationMode(v);
                toggleVacation(v);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
        {vacationMode && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Your store is currently in vacation mode. Customers cannot see or purchase your products.
            </p>
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notification Preferences">
        <div className="space-y-4">
          {[
            { id: "new_order",    label: "New Order",           desc: "When a customer places an order" },
            { id: "order_status", label: "Order Status Updates", desc: "Delivery and tracking updates"   },
            { id: "payout",       label: "Payout Notifications", desc: "When funds are transferred"     },
            { id: "review",       label: "Product Reviews",     desc: "When customers leave reviews"    },
            { id: "low_stock",    label: "Low Stock Alerts",    desc: "When stock falls below 5 units"  },
          ].map(({ id, label, desc }) => (
            <div key={id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section title="Security">
        <form onSubmit={handlePw(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <input
              {...regPw("newPassword", { required: "New password is required", minLength: { value: 8, message: "Min 8 characters" } })}
              type="password"
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <input
              {...regPw("confirmPassword", {
                required: "Please confirm your password",
                validate: (v) => v === watchPw("newPassword") || "Passwords do not match",
              })}
              type="password"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={pwSubmitting}
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {pwSubmitting ? "Updating…" : "Update Password"}
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <h2 className="font-bold text-red-800 dark:text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400">
          Closing your vendor account will hide all your products from the store. Your account data is retained for 30 days before permanent deletion.
        </p>
        <button className="text-sm font-bold text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 px-5 py-2.5 rounded-xl transition-colors">
          Request Account Closure
        </button>
      </div>
    </div>
  );
}
