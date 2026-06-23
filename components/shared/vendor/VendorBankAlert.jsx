"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { NIGERIAN_BANKS, getBankName } from "@/lib/nigerian-banks";
import toast from "react-hot-toast";

const fetchStatus = async () => {
  const r = await fetch("/api/vendor/bank-status");
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Failed to load");
  return d;
};

// Inner form — mounted only when the alert is open, so useState initializers
// pick up the vendor's current (unverified) values without needing an effect.
function BankFixForm({ initialBankCode, initialAccount, onVerified }) {
  const qc = useQueryClient();
  const [bankCode, setBankCode] = useState(initialBankCode || "");
  const [account,  setAccount]  = useState(initialAccount || "");

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/vendor/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          bank_code:           bankCode,
          bank_account_number: account,
          bank_name:           getBankName(bankCode) ?? "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not verify your bank details");
      return d;
    },
    onSuccess: () => {
      toast.success("Bank details verified. Thank you!");
      qc.invalidateQueries({ queryKey: ["vendor-bank-status"] });
      onVerified?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const canSubmit = bankCode && account.trim().length >= 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit || save.isPending) return;
    save.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Bank
        </label>
        <select
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Select your bank</option>
          {NIGERIAN_BANKS.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Account number
        </label>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit account number"
          className="w-full px-3.5 py-2.5 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || save.isPending}
        className="mt-2 w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {save.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
          : <><ShieldCheck className="w-4 h-4" /> Verify &amp; save</>}
      </button>
    </form>
  );
}

/**
 * Uncancelable modal shown when the vendor portal is unlocked (KYC complete) and
 * the vendor's saved bank details could not be verified (account number on file
 * but no resolved account name). Payouts to such an account would fail, so the
 * vendor must correct their bank + account number here. It re-verifies through
 * the same settings endpoint (which resolves the account name via Flutterwave),
 * and only closes once verification succeeds.
 *
 * `enabled` lets the parent suppress the fetch while KYC is still incomplete.
 */
export default function VendorBankAlert({ enabled = true }) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["vendor-bank-status"],
    queryFn:  fetchStatus,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const open = enabled && data?.needsAttention;
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
              Confirm your bank details
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            We couldn&apos;t verify the bank account on your profile, so we can&apos;t pay you yet.
            Please pick the right bank and enter your account number to fix this. You won&apos;t be
            able to receive payouts until this is done.
          </p>

          <BankFixForm
            initialBankCode={data.bankCode}
            initialAccount={data.bankAccountNumber}
            onVerified={() => qc.invalidateQueries({ queryKey: ["vendor-bank-status"] })}
          />

          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3">
            Need help? Email{" "}
            <a href="mailto:support@carmelmart.com" className="text-primary hover:underline font-medium">
              support@carmelmart.com
            </a>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
