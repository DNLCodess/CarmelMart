"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, ShieldCheck, AlertTriangle, X, Plus, Search, RefreshCw, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

// ── User Search Picker ─────────────────────────────────────────────────────

const ROLE_FILTERS = [
  { value: "",         label: "All"      },
  { value: "customer", label: "Customers" },
  { value: "vendor",   label: "Vendors"  },
];

function UserSearchPicker({ selected, onSelect }) {
  const [query,      setQuery]      = useState("");
  const [roleFilter, setRoleFilter] = useState("customer");
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: q, page: 1 });
        if (roleFilter) params.set("role", roleFilter);
        const r = await fetch(`/api/admin/users?${params}`);
        const d = await r.json();
        setResults(d.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, roleFilter]);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.email}</p>
          {selected.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{selected.phone}</p>}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Role filter pills */}
      <div className="flex gap-1">
        {ROLE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => { setRoleFilter(value); setResults([]); }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === value
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or phone…"
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {loading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onSelect(u); setQuery(""); setResults([]); }}
              className="flex items-center justify-between w-full px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors border-b last:border-0 border-gray-50 dark:border-gray-700"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{u.phone ?? "No phone"} · {u.role}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 -rotate-90 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {query.trim() && !loading && results.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No users found</p>
      )}

      {!query.trim() && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Type to search users</p>
      )}
    </div>
  );
}

// ── Record Refusal Modal ───────────────────────────────────────────────────

function RecordRefusalModal({ onClose, onSave, saving, preselectedUser = null }) {
  const [selectedUser, setSelectedUser] = useState(preselectedUser);
  const [orderId, setOrderId] = useState("");
  const [notes,   setNotes]   = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) { toast.error("Select a customer first"); return; }
    onSave({ userId: selectedUser.id, orderId: orderId.trim() || null, notes: notes.trim() || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Record POD Refusal</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Users are auto-blacklisted after 3 recorded refusals.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Customer *</label>
            <UserSearchPicker selected={selectedUser} onSelect={setSelectedUser} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Order ID (optional)</label>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Related order UUID"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What happened?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving || !selectedUser} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Recording…" : "Record Refusal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PODBlacklistPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pod-blacklist"],
    queryFn: () => fetch("/api/admin/pod-blacklist").then((r) => r.json()),
  });

  const users      = data?.users ?? [];
  const blacklisted = users.filter((u) => u.blacklisted);
  const warned      = users.filter((u) => !u.blacklisted);

  const mutate = useMutation({
    mutationFn: (body) =>
      fetch("/api/admin/pod-blacklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d, vars) => {
      if (d.error) { toast.error(d.error); return; }
      const labels = { record_refusal: "Refusal recorded", blacklist: "User blacklisted", unblacklist: "User removed from blacklist" };
      toast.success(labels[vars.action] ?? "Done");
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ["admin-pod-blacklist"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const UserRow = ({ u }) => (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
      <td className="px-5 py-4">
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{u.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < u.refusedCount ? "bg-red-500" : "bg-gray-200 dark:bg-gray-600"}`} />
          ))}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{u.refusedCount}/3</span>
        </div>
      </td>
      <td className="px-5 py-4">
        {u.blacklisted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <ShieldOff className="w-3 h-3" /> Blacklisted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        )}
      </td>
      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{u.blacklistedAt || "—"}</td>
      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{u.reason || "—"}</td>
      <td className="px-5 py-4">
        {u.blacklisted ? (
          <button
            onClick={() => mutate.mutate({ userId: u.id, action: "unblacklist" })}
            disabled={mutate.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Unblacklist
          </button>
        ) : (
          <button
            onClick={() => mutate.mutate({ userId: u.id, action: "blacklist" })}
            disabled={mutate.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <ShieldOff className="w-3.5 h-3.5" /> Blacklist
          </button>
        )}
      </td>
    </tr>
  );

  const TableHead = () => (
    <thead>
      <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Refusals</th>
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Blacklisted On</th>
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reason</th>
        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">POD Blacklist</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customers who refuse pay-on-delivery orders. Auto-blacklisted after 3 refusals.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Record Refusal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Blacklisted",           value: blacklisted.length, color: "text-red-600 dark:text-red-400"   },
          { label: "At Risk (1–2 refusals)", value: warned.length,      color: "text-amber-600 dark:text-amber-400" },
          { label: "Total Tracked",          value: users.length,       color: "text-gray-900 dark:text-gray-100"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">Loading…</div>
      ) : users.length === 0 ? (
        <div className="p-12 flex flex-col items-center gap-3 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No POD issues</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No customers have refused POD orders yet.</p>
          </div>
        </div>
      ) : (
        <>
          {blacklisted.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/10">
                <h3 className="font-bold text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" /> Blacklisted ({blacklisted.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><TableHead /><tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">{blacklisted.map((u) => <UserRow key={u.id} u={u} />)}</tbody></table>
              </div>
            </div>
          )}
          {warned.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10">
                <h3 className="font-bold text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> At Risk ({warned.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><TableHead /><tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">{warned.map((u) => <UserRow key={u.id} u={u} />)}</tbody></table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <RecordRefusalModal
          onClose={() => setShowModal(false)}
          onSave={(body) => mutate.mutate({ ...body, action: "record_refusal" })}
          saving={mutate.isPending}
        />
      )}
    </div>
  );
}
