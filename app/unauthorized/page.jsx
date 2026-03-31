"use client";

import Link from "next/link";
import { ShieldOff, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function UnauthorizedPage() {
  const { isAuthenticated, role } = useAuth();

  const getHomeLink = () => {
    if (!isAuthenticated) return "/login";
    if (role === "vendor") return "/vendor/dashboard";
    if (role === "admin") return "/dashboard";
    return "/my-account";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          You don&apos;t have permission to view this page. If you believe this is a
          mistake, please contact support.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            href={getHomeLink()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            {isAuthenticated ? "My Dashboard" : "Sign In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
