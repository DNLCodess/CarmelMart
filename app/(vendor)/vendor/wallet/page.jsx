"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, ArrowUp, ArrowDown, Wallet, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

async function fetchVendorWallet() {
  const r = await fetch("/api/vendor/wallet");
  return r.json();
}

export default function VendorWalletPage() {
  const qc = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount]             = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-wallet"],
    queryFn: fetchVendorWallet,
    staleTime: 30_000,
    retry: false,
  });

  const balance          = data?.balance           ?? 0;
  const pendingPayout    = data?.pending_payout    ?? 0;
  const totalEarned      = data?.total_earned      ?? 0;
  const nextPayoutDate   = data?.next_payout_date  ?? "—";
  const transactions     = data?.transactions      ?? [];

  const { mutate: withdraw, isPending: submitting } = useMutation({
    mutationFn: async (amt) => {
      const r = await fetch("/api/vendor/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Withdrawal failed");
      return d;
    },
    onSuccess: (d) => {
      toast.success(d.message ?? "Withdrawal initiated!");
      qc.invalidateQueries({ queryKey: ["vendor-wallet"] });
      qc.invalidateQueries({ queryKey: ["vendor-stats"] });
      setShowWithdraw(false);
      setAmount("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < 5000) { toast.error("Minimum withdrawal is ₦5,000"); return; }
    if (amt > balance)       { toast.error("Insufficient balance"); return; }
    withdraw(amt);
  };

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-4 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-sm text-white/70 font-semibold uppercase tracking-wide">Available Balance</p>
          {isLoading ? (
            <div className="w-32 h-10 bg-white/20 rounded-lg animate-pulse mt-2 mb-4" />
          ) : (
            <p className="text-4xl font-extrabold mt-1 mb-4">₦{balance.toLocaleString()}</p>
          )}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex items-center gap-2 bg-white text-primary text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-95 transition-opacity"
            >
              <Download className="w-4 h-4" /> Withdraw Funds
            </button>
            <button className="flex items-center gap-2 bg-white/10 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-white/20 transition-colors border border-white/20">
              <Eye className="w-4 h-4" /> Statement
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Pending Settlement</p>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">₦{pendingPayout.toLocaleString()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From delivered orders not yet paid out</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Total Earned</p>
          <p className="text-xl font-extrabold text-green-600 dark:text-green-400 mt-1">₦{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">All-time credits to your wallet</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-5 py-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Next Payout</p>
          <p className="text-xl font-extrabold text-primary mt-1">{isLoading ? "—" : nextPayoutDate}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Weekly payouts every Friday</p>
        </div>
      </div>

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Withdraw Funds</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Funds are transferred to your registered bank account. Processing takes 1–2 business days.
          </p>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Amount (₦) <span className="text-gray-400 dark:text-gray-500 font-normal">— min ₦5,000</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={5000}
                max={balance}
                step="any"
                placeholder="50000"
                required
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400 mb-1">
                <span>Transfer amount</span>
                <span>₦{(Number(amount) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400 dark:text-gray-500 text-xs mb-2">
                <span>Processing fee</span>
                <span>₦0</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-600 pt-2">
                <span>You receive</span>
                <span>₦{(Number(amount) || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? "Processing…" : "Confirm Withdrawal"}
              </button>
              <button
                type="button"
                onClick={() => { setShowWithdraw(false); setAmount(""); }}
                className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Earned",    value: isLoading ? "—" : `₦${totalEarned.toLocaleString()}`,   color: "text-green-600" },
          { label: "Available",       value: isLoading ? "—" : `₦${balance.toLocaleString()}`,        color: "text-primary"   },
          { label: "Pending Payout",  value: isLoading ? "—" : `₦${pendingPayout.toLocaleString()}`,  color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-extrabold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Transaction History</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === "credit" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                }`}>
                  {t.type === "credit"
                    ? <ArrowUp className="w-4 h-4 text-green-600" />
                    : <ArrowDown className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.date}</p>
                </div>
                <p className={`font-bold text-sm shrink-0 ${t.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                  {t.type === "credit" ? "+" : "−"}₦{(t.amount || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
