"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Truck, ShoppingCart, ShieldCheck, Menu, X,
  LogOut, Sun, Moon, Store, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { logoutAction } from "@/app/actions/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboardTheme } from "@/lib/useDashboardTheme";

const NAV_ITEMS = [
  { href: "/logistics/orders",       label: "Orders",        icon: ShoppingCart },
  { href: "/logistics/auth-requests", label: "My Requests",  icon: ShieldCheck  },
];

export default function LogisticsShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname  = usePathname();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { user }  = useAuth();
  const { dark, toggle, mounted } = useDashboardTheme("cm-logistics-theme");

  const displayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name ?? ""}`.trim()
    : user?.email ?? "Logistics";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await logoutAction();
    qc.invalidateQueries({ queryKey: ["auth-user"] });
    router.push("/login");
  };

  const isActive = (href) => pathname.startsWith(href);
  const currentLabel = NAV_ITEMS.find((n) => isActive(n.href))?.label ?? "Logistics";

  // Pending auth-request count badge
  const { data: requestsData } = useQuery({
    queryKey: ["logistics-auth-requests"],
    queryFn:  () => fetch("/api/logistics/auth-requests").then((r) => r.json()),
    staleTime: 60_000,
    retry:    false,
  });
  const pendingRequests = (requestsData?.requests ?? []).filter((r) => r.status === "pending").length;

  return (
    <div
      className={`flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 ${mounted && dark ? "dark" : ""}`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-30 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-gray-900 dark:text-gray-100 leading-none truncate text-sm">
                CarmelMart
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide mt-0.5">
                Logistics Portal
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            const isPendingItem = href.includes("auth-requests") && pendingRequests > 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {isPendingItem && (
                  <span className="w-5 h-5 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingRequests}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Logistics Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-5 sm:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 dark:text-gray-100">{currentLabel}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              CarmelMart Logistics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/"
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title="View store"
            >
              <Store className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-5 sm:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
