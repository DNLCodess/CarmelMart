"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Users, RefreshCw, ShieldCheck, ShieldOff, Ban, CheckCircle, ChevronDown, AlertTriangle, X, Truck, Bike } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchUsers(params) {
  const r = await fetch(`/api/admin/users?${params}`);
  return r.json();
}

async function updateUser(id, action) {
  const r = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!r.ok) {
    const d = await r.json();
    throw new Error(d.error ?? "Update failed");
  }
  return r.json();
}

const ROLE_CFG = {
  customer:        { label: "Customer",  cls: "bg-blue-50   text-blue-700   border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"     },
  vendor:          { label: "Vendor",    cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800" },
  admin:           { label: "Admin",     cls: "bg-red-50    text-red-700    border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"       },
  logistics_admin: { label: "Logistics", cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800" },
  rider:           { label: "Rider",     cls: "bg-green-50  text-green-700  border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"   },
};

const STATUS_CFG = {
  suspended: { label: "Suspended", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  banned:    { label: "Banned",    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
};

function RoleBadge({ role }) {
  const c = ROLE_CFG[role] ?? { label: role, cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status || status === "active") return null;
  const c = STATUS_CFG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function ActionsMenu({ user, onAction, onRecordPOD }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actions = [];
  if (user.status === "suspended" || user.status === "banned") {
    actions.push({ key: "unsuspend", label: "Unsuspend", icon: CheckCircle, cls: "text-green-600" });
  } else {
    actions.push({ key: "suspend", label: "Suspend", icon: ShieldOff, cls: "text-amber-600" });
    actions.push({ key: "ban",     label: "Ban",     icon: Ban,      cls: "text-red-600"   });
  }
  if (user.role !== "admin") {
    actions.push({ key: "promote", label: "Promote to Admin", icon: ShieldCheck, cls: "text-violet-600" });
  } else {
    actions.push({ key: "demote", label: "Remove Admin",      icon: ShieldOff,   cls: "text-gray-600"  });
  }
  if (user.role !== "logistics_admin") {
    actions.push({ key: "set_logistics_admin", label: "Set as Logistics Admin", icon: Truck, cls: "text-orange-600 dark:text-orange-400" });
  }
  if (user.role !== "rider") {
    actions.push({ key: "set_rider", label: "Set as Rider", icon: Bike, cls: "text-green-600 dark:text-green-400" });
  }
  if (user.role === "logistics_admin" || user.role === "rider") {
    actions.push({ key: "demote", label: "Demote to Customer", icon: ShieldOff, cls: "text-gray-600 dark:text-gray-400" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg py-1">
          {actions.map(({ key, label, icon: Icon, cls }) => (
            <button
              key={key}
              onClick={() => { setOpen(false); onAction(user.id, key); }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${cls}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          <button
            onClick={() => { setOpen(false); onRecordPOD(user); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Record POD Refusal
          </button>
        </div>
      )}
    </div>
  );
}

function QuickPODModal({ user, onClose, onSave, saving }) {
  const [orderId, setOrderId] = useState("");
  const [notes,   setNotes]   = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ userId: user.id, orderId: orderId.trim() || null, notes: notes.trim() || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Record POD Refusal</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.email}</p>
          {user.phone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.phone}</p>}
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Auto-blacklisted after 3 recorded refusals.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Recording…" : "Record Refusal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_TABS = [
  { value: "",         label: "All Users" },
  { value: "customer", label: "Customers" },
  { value: "vendor",   label: "Vendors"   },
  { value: "admin",    label: "Admins"    },
];

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [podTarget, setPodTarget]   = useState(null); // user to record POD for
  const queryClient = useQueryClient();

  const params = new URLSearchParams({ page });
  if (roleFilter) params.set("role", roleFilter);
  if (search)     params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter, search, page],
    queryFn: () => fetchUsers(params.toString()),
    staleTime: 30_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: ({ id, action }) => updateUser(id, action),
    onSuccess: (_, { action }) => {
      const labels = { suspend: "suspended", ban: "banned", unsuspend: "unsuspended", promote: "promoted to admin", demote: "admin access removed" };
      toast.success(`User ${labels[action] ?? action}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const podMutation = useMutation({
    mutationFn: (body) =>
      fetch("/api/admin/pod-blacklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      toast.success("POD refusal recorded");
      setPodTarget(null);
    },
    onError: () => toast.error("Failed to record refusal"),
  });

  const handleAction = (id, action) => {
    const confirmMessages = {
      ban:     "Ban this user? They will lose platform access.",
      suspend: "Suspend this user?",
      promote: "Promote this user to admin? They will have full platform access.",
      demote:  "Remove admin access from this user?",
    };
    const msg = confirmMessages[action];
    if (msg && !window.confirm(msg)) return;
    mutation.mutate({ id, action });
  };

  const users = data?.users ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      {podTarget && (
        <QuickPODModal
          user={podTarget}
          onClose={() => setPodTarget(null)}
          onSave={(body) => podMutation.mutate({ ...body, action: "record_refusal" })}
          saving={podMutation.isPending}
        />
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} registered accounts</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setRoleFilter(value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === value ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-14 text-center">
            <Users className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wallet</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{(u.email?.[0] ?? "?").toUpperCase()}</span>
                        </div>
                        <div>
                          <Link href={`/admin/users/${u.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary transition-colors">
                            {u.email}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{u.id.slice(0, 8)}</p>
                            <StatusBadge status={u.status} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">{u.phone ?? "—"}</td>
                    <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">₦{(u.wallet_balance || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {new Date(u.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ActionsMenu user={u} onAction={handleAction} onRecordPOD={setPodTarget} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
