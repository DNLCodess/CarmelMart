"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, RefreshCw, Phone } from "lucide-react";

async function fetchCustomers() {
  const r = await fetch("/api/vendor/customers");
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed to load customers");
  return d;
}

export default function VendorCustomersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-customers"],
    queryFn: fetchCustomers,
    staleTime: 60_000,
    retry: false,
  });

  const allCustomers = data?.customers ?? [];
  const total        = data?.total ?? 0;

  const customers = search.trim()
    ? allCustomers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      )
    : allCustomers;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Customers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} unique customer{total !== 1 ? "s" : ""} who ordered from your store
          </p>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading customers…</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">
              {search ? "No customers match your search" : "No customers yet"}
            </p>
            {!search && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Customers who place orders with your store will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Orders</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Spent</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Last Order</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(c.name?.[0] ?? "?").toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                      ₦{(c.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {c.lastOrderAt ?? "—"}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
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
