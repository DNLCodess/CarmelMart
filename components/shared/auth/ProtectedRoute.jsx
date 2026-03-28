"use client";

// UX-only guard — shows a spinner and redirects client-side.
// This is NOT a security layer. Security is enforced by server layouts
// calling requireAuth() / requireAdmin() / requireVendor() from lib/session.js.

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireVendor = false,
  requireAuth = true,
}) {
  const { isAuthenticated, isAdmin, isVendor, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if ((requireAuth || requireAdmin || requireVendor) && !isAuthenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace("/unauthorized");
      return;
    }
    if (requireVendor && !isVendor && !isAdmin) {
      router.replace("/unauthorized");
      return;
    }
  }, [isLoading, isAuthenticated, isAdmin, isVendor, requireAuth, requireAdmin, requireVendor, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if ((requireAuth || requireAdmin || requireVendor) && !isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return null;
  if (requireVendor && !isVendor && !isAdmin) return null;

  return children;
}
