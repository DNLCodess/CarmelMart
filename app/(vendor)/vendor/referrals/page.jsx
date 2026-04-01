"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Check, Users, RefreshCw, Share2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

async function fetchReferrals() {
  const r = await fetch("/api/vendor/referrals");
  return r.json();
}

const STATUS_CFG = {
  completed: { label: "Completed", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

export default function VendorReferralsPage() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-referrals"],
    queryFn: fetchReferrals,
    staleTime: 60_000,
    retry: false,
  });

  const referralCode = data?.referralCode ?? "";
  const stats        = data?.stats ?? { total: 0, completed: 0, pending: 0, earned: 0 };
  const referrals    = data?.referrals ?? [];

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://carmelmart.com"}/register?ref=${referralCode}`
    : "";

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — try manually");
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Join CarmelMart as a vendor and start selling today! Use my referral link to sign up and we both earn ₦500:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const STATS = [
    { label: "Total Referrals",     value: stats.total,                             color: "text-gray-900 dark:text-gray-100" },
    { label: "Completed",           value: stats.completed,                          color: "text-green-600 dark:text-green-400" },
    { label: "Pending",             value: stats.pending,                            color: "text-amber-600 dark:text-amber-400" },
    { label: "Total Earned",        value: `₦${stats.earned.toLocaleString()}`,      color: "text-primary" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Referral Program</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Earn ₦500 for every vendor you refer who completes registration.
        </p>
      </div>

      {/* Referral card */}
      <div className="bg-linear-to-br from-primary to-primary-dark rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">Your Referral Code</p>
            <p className="text-white/70 text-sm mt-0.5">Share with vendors to earn rewards</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 flex items-center justify-between gap-3 mb-4">
          <span className="font-mono font-bold text-2xl tracking-widest">
            {isLoading ? "Loading…" : (referralCode || "N/A")}
          </span>
          <button
            onClick={() => handleCopy(referralCode)}
            disabled={!referralCode}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-40"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleCopy(referralLink)}
            disabled={!referralLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
          >
            <Share2 className="w-4 h-4" />
            Copy Link
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={!referralLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366]/80 hover:bg-[#25D366] rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
          >
            <MessageCircle className="w-4 h-4" />
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-4 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
        <p className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-3">How it works</p>
        <ol className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
          <li>1. Share your referral code or link with another person</li>
          <li>2. They sign up as a vendor using your code</li>
          <li>3. Once their registration is <strong>complete</strong>, you both earn ₦500</li>
          <li>4. Earnings are credited to your wallet automatically</li>
        </ol>
      </div>

      {/* Referral history */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Referral History</h3>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center">
            <Gift className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No referrals yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Share your code to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name / Email</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Joined</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</p>
                      {r.email && <p className="text-xs text-gray-400 dark:text-gray-500">{r.email}</p>}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-gray-500 dark:text-gray-400 text-xs">{r.joinedDate ?? r.date}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {r.status === "completed"
                        ? <span className="text-green-600 dark:text-green-400">+₦500</span>
                        : <span className="text-gray-400 dark:text-gray-500">Pending</span>
                      }
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
