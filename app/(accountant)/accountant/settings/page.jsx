"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2, User, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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

export default function AccountantSettingsPage() {
  const { user } = useAuth();

  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/accountant/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to update password");
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email ?? "Accountant";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account</p>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Your Account
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Accountant
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Change Password
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Choose a strong password with at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Current Password"
            value={form.current_password}
            onChange={set("current_password")}
            placeholder="Enter your current password"
          />
          <PasswordInput
            label="New Password"
            value={form.new_password}
            onChange={set("new_password")}
            placeholder="At least 8 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            value={form.confirm_password}
            onChange={set("confirm_password")}
            placeholder="Repeat new password"
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.current_password || !form.new_password || !form.confirm_password}
            className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
