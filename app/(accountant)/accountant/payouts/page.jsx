"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  SlidersHorizontal,
  Search,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "7d",  label: "7 Days"   },
  { value: "30d", label: "30 Days"  },
  { value: "90d", label: "90 Days"  },
  { value: "all", label: "All Time" },
];

const STATUSES = [
  { value: "",           label: "All"        },
  { value: "pending",    label: "Pending"    },
  { value: "processing", label: "Processing" },
  { value: "completed",  label: "Completed"  },
  { value: "failed",     label: "Failed"     },
];

const STATUS_CLASSES = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS = {
  pending:    Clock,
  processing: RefreshCw,
  completed:  CheckCircle,
  failed:     XCircle,
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchPayouts({ range, status, page }) {
  const params = new URLSearchParams({ range, page });
  if (status) params.set("status", status);
  const r = await fetch(`/api/accountant/payouts?${params}`);
  if (!r.ok) throw new Error("Failed to load payouts");
  return r.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStrip({ summary, isLoading }) {
  const fmtN = (n) => `₦${(n ?? 0).toLocaleString()}`;
  const items = [
    { label: "Completed",  value: fmtN(summary?.totalCompleted), colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle },
    { label: "Pending",    value: fmtN(summary?.totalPending),   colorClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",   icon: Clock       },
    { label: "Failed",     value: fmtN(summary?.totalFailed),    colorClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",               icon: XCircle     },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, colorClass }) => (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3.5 flex flex-col gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
            {isLoading
              ? <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              : <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">{value}</p>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {status}
    </span>
  );
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{total} payouts total</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">{page} / {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountantPayoutsPage() {
  const [range,  setRange]  = useState("30d");
  const [status, setStatus] = useState("");
  const [page,   setPage]   = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["accountant-payouts", range, status, page],
    queryFn: () => fetchPayouts({ range, status, page }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const payouts    = data?.payouts    ?? [];
  const summary    = data?.summary    ?? {};
  const pagination = data?.pagination ?? {};
  const fmtN       = (n) => `₦${(n ?? 0).toLocaleString()}`;

  const handleFilter = (setter) => (val) => { setter(val); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Vendor Payouts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Full payout history for all vendors</p>
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} isLoading={isLoading} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-2 items-center">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />

        {/* Range */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilter(setRange)(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                range === value
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter as pill buttons */}
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilter(setStatus)(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                status === value
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isFetching && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />}
      </div>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 animate-pulse">
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-48 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
          ))
        ) : payouts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
            <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No payouts found</p>
          </div>
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.vendor}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.vendorEmail}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Amount</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5 text-base">{fmtN(p.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Bank</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{p.bankName}</p>
                </div>
                {p.reference && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500">Reference</p>
                    <p className="font-mono text-gray-600 dark:text-gray-400 mt-0.5 truncate">{p.reference}</p>
                  </div>
                )}
                {p.error && (
                  <div className="col-span-2">
                    <p className="text-red-400">Error</p>
                    <p className="text-red-600 dark:text-red-400 mt-0.5 text-[11px]">{p.error}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/60">
                <span>{p.bankAccount}</span>
                <span>{p.date}</span>
              </div>
            </div>
          ))
        )}
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
                {["Vendor", "Amount", "Status", "Bank", "Account", "Reference", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No payouts found
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{p.vendor}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{p.vendorEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtN(p.amount)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{p.bankName}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-400">{p.bankAccount}</td>
                    <td className="px-4 py-3.5">
                      {p.reference
                        ? <span className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate block">{p.reference}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                      {p.error && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{p.error}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{p.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{pagination.total} payouts total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2">{pagination.page} / {pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
