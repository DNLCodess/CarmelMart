"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Store, User, Plus, Trash2, Check, X,
  Eye, EyeOff, RefreshCw, AlertTriangle, Copy,
  ChevronDown, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

// Dev guard — this page renders a 404-style message in production
const IS_DEV = process.env.NODE_ENV !== "production";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function createUser(payload) {
  const r = await fetch("/api/dev/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d;
}

async function fetchUsers() {
  const r = await fetch("/api/dev/create-user");
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.users;
}

// ─── role badge ───────────────────────────────────────────────────────────────

const ROLE_CFG = {
  admin:    { label: "Admin",    cls: "bg-purple-100 text-purple-700 border-purple-200", Icon: Shield  },
  vendor:   { label: "Vendor",   cls: "bg-blue-100   text-blue-700   border-blue-200",   Icon: Store   },
  customer: { label: "Customer", cls: "bg-green-100  text-green-700  border-green-200",  Icon: User    },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.customer;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ─── create form ──────────────────────────────────────────────────────────────

function CreateForm({ onSuccess }) {
  const [form, setForm] = useState({
    role: "vendor",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    businessName: "",
  });
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      toast.success(`${form.role} account created!`);
      qc.invalidateQueries({ queryKey: ["dev-users"] });
      onSuccess?.(data.user);
      setForm({ role: form.role, email: "", password: "", firstName: "", lastName: "", businessName: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    mutate(form);
  };

  const fillDefaults = (role) => {
    const ts = Date.now().toString().slice(-4);
    if (role === "admin") {
      setForm({ role, email: `admin${ts}@carmelmart.dev`, password: "AdminPass123!", firstName: "Admin", lastName: "User", businessName: "" });
    } else if (role === "vendor") {
      setForm({ role, email: `vendor${ts}@carmelmart.dev`, password: "VendorPass123!", firstName: "Vendor", lastName: "Owner", businessName: `Test Store ${ts}` });
    } else {
      setForm({ role, email: `customer${ts}@carmelmart.dev`, password: "CustomerPass123!", firstName: "Test", lastName: "Customer", businessName: "" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Role selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
        <div className="grid grid-cols-3 gap-2">
          {["admin", "vendor", "customer"].map((r) => {
            const cfg = ROLE_CFG[r];
            const Icon = cfg.Icon;
            return (
              <button
                key={r}
                type="button"
                onClick={() => { set("role", r); fillDefaults(r); }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                  form.role === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="Dev"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="User"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {form.role === "vendor" && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Business Name</label>
          <input
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
            placeholder="Test Store"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          placeholder="user@carmelmart.dev"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            placeholder="Min 6 characters"
            className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity text-sm"
      >
        {isPending ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
        ) : (
          <><Plus className="w-4 h-4" /> Create {ROLE_CFG[form.role].label}</>
        )}
      </button>
    </form>
  );
}

// ─── users table ──────────────────────────────────────────────────────────────

function UserRow({ user }) {
  const [expanded, setExpanded] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success("User ID copied");
  };

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            {user.first_name} {user.last_name}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {new Date(user.created_at).toLocaleDateString("en-NG")}
        </td>
        <td className="px-4 py-3">
          {user.vendors ? (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {user.vendors.business_name}
            </span>
          ) : null}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-8 py-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 select-all">
                {user.id}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); copyId(); }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            {user.vendors && (
              <p className="text-xs text-gray-500 mt-1">
                Vendor status: <span className="font-semibold text-gray-700 capitalize">{user.vendors.verification_status}</span>
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function DevPage() {
  const [lastCreated, setLastCreated] = useState(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["dev-users"],
    queryFn: fetchUsers,
    enabled: IS_DEV,
  });

  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-500">This page is not available in production.</p>
        </div>
      </div>
    );
  }

  const quickLinks = [
    { label: "Vendor Dashboard", href: "/vendor/dashboard", icon: Store },
    { label: "Admin Dashboard",  href: "/admin/dashboard",  icon: Shield },
    { label: "Homepage",         href: "/",                 icon: User   },
    { label: "Login",            href: "/login",            icon: User   },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Developer Tools — Dev Environment Only</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This page is <strong>disabled in production</strong>. Use it to seed test accounts
              for admin, vendor, and customer roles. All accounts are email-confirmed automatically.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Create form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create Test Account
            </h2>
            <CreateForm onSuccess={setLastCreated} />

            {lastCreated && (
              <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5 mb-2">
                  <Check className="w-4 h-4" /> Account created
                </p>
                <div className="space-y-1 text-xs text-green-700">
                  <p>ID: <span className="font-mono">{lastCreated.id}</span></p>
                  <p>Email: <span className="font-semibold">{lastCreated.email}</span></p>
                  <p>Role: <span className="capitalize font-semibold">{lastCreated.role}</span></p>
                </div>
                <div className="flex gap-2 mt-3">
                  {lastCreated.role === "admin" && (
                    <a href="/admin/dashboard" className="text-xs font-semibold text-green-800 underline">
                      → Open Admin Dashboard
                    </a>
                  )}
                  {lastCreated.role === "vendor" && (
                    <a href="/vendor/dashboard" className="text-xs font-semibold text-green-800 underline">
                      → Open Vendor Dashboard
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick links + tips */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Quick Navigation</h2>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-3">Testing Notes</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Email is auto-confirmed — no inbox needed
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Vendor accounts are auto-verified (verification_status = verified)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Click a role button to auto-fill demo credentials
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  Passwords must be ≥6 characters (Supabase requirement)
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  Route is blocked (404) in production automatically
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              All Users
              <span className="ml-2 text-sm font-normal text-gray-500">({users.length})</span>
            </h2>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No users yet. Create one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <UserRow key={u.id} user={u} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
