"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { value: "7d",  label: "7 Days"   },
  { value: "30d", label: "30 Days"  },
  { value: "90d", label: "90 Days"  },
  { value: "all", label: "All Time" },
];

const TYPES = [
  { value: "",       label: "All Types" },
  { value: "credit", label: "Credits"   },
  { value: "debit",  label: "Debits"    },
];

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchTransactions({ range, type, search, page }) {
  const params = new URLSearchParams({ range, page });
  if (type)   params.set("type",   type);
  if (search) params.set("search", search);
  const r = await fetch(`/api/accountant/transactions?${params}`);
  if (!r.ok) throw new Error("Failed to load transactions");
  return r.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStrip({ summary, isLoading }) {
  const fmtN = (n) => `₦${(n ?? 0).toLocaleString()}`;
  const items = [
    { label: "Total Credits", value: fmtN(summary?.totalCredits), icon: TrendingUp,   colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { label: "Total Debits",  value: fmtN(summary?.totalDebits),  icon: TrendingDown, colorClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"                 },
    { label: "Net Flow",      value: fmtN(summary?.net),          icon: ArrowLeftRight, colorClass: (summary?.net ?? 0) >= 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
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

function TypeBadge({ type }) {
  if (type === "credit") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <ArrowDownLeft className="w-2.5 h-2.5" /> Credit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <ArrowUpRight className="w-2.5 h-2.5" /> Debit
    </span>
  );
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{total} transactions total</p>
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

export default function AccountantTransactionsPage() {
  const [range,  setRange]  = useState("30d");
  const [type,   setType]   = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page,   setPage]   = useState(1);
  const [searchTimer, setSearchTimer] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["accountant-transactions", range, type, debouncedSearch, page],
    queryFn: () => fetchTransactions({ range, type, search: debouncedSearch, page }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const transactions = data?.transactions ?? [];
  const summary      = data?.summary      ?? {};
  const pagination   = data?.pagination   ?? {};
  const fmtN         = (n) => `₦${(n ?? 0).toLocaleString()}`;

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer);
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
    setSearchTimer(t);
  };

  const handleFilter = (setter) => (val) => { setter(val); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Wallet Transactions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Complete audit log of all wallet activity</p>
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} isLoading={isLoading} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user, description, or reference…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
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

          {/* Type filter */}
          <div className="flex gap-1">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFilter(setType)(value)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  type === value
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
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
            <ArrowLeftRight className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No transactions found</p>
          </div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.user}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.userEmail}</p>
                </div>
                <TypeBadge type={t.type} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Amount</p>
                  <p className={`font-bold mt-0.5 text-base ${t.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {t.type === "credit" ? "+" : "-"}{fmtN(t.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500">Role</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{t.userRole ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400 dark:text-gray-500">Description</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300 mt-0.5">{t.description}</p>
                </div>
                {t.reference && (
                  <div className="col-span-2">
                    <p className="text-gray-400 dark:text-gray-500">Reference</p>
                    <p className="font-mono text-gray-600 dark:text-gray-400 mt-0.5 truncate text-[11px]">{t.reference}</p>
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-700/60">
                {t.date}
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
                {["User", "Type", "Amount", "Description", "Reference", "Role", "Date"].map((h) => (
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
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{t.user}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t.userEmail}</p>
                    </td>
                    <td className="px-4 py-3.5"><TypeBadge type={t.type} /></td>
                    <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${t.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {t.type === "credit" ? "+" : "-"}{fmtN(t.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 max-w-[220px]">
                      <span className="truncate block">{t.description}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.reference
                        ? <span className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate block">{t.reference}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 capitalize text-xs">{t.userRole ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{t.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{pagination.total} transactions total</p>
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
