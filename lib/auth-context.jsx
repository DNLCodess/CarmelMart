"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { fetchAuthUser } from "@/lib/auth";

const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 min
const IDLE_WARNING_MS = 13 * 60 * 1000;  // warn at 13 min
const IDLE_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auth-user"],
    queryFn: fetchAuthUser,
    staleTime: Infinity, // Only re-fetch when explicitly invalidated
    retry: false,
  });

  const user = query.data?.user ?? null;
  const role = query.data?.role ?? null;
  const isLoading = query.isPending;
  const isAuthenticated = !!user;
  const isAdmin = role === "admin";
  const isVendor = role === "vendor";
  const isCustomer = role === "customer";

  // Admin idle timeout — auto-logout after 15 min inactivity
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningToastRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current);
    }
  }, []);

  const forceLogout = useCallback(
    async (reason = "idle") => {
      clearTimers();
      const supabase = createClient();
      await supabase.auth.signOut();
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });

      if (reason === "idle") {
        toast("Logged out due to inactivity.");
      } else if (reason === "token") {
        toast.error("Session expired. Please sign in again.");
      }
    },
    [clearTimers, queryClient],
  );

  const resetIdleTimer = useCallback(() => {
    clearTimers();
    warningTimerRef.current = setTimeout(() => {
      warningToastRef.current = toast(
        "You will be logged out in 2 minutes due to inactivity.",
        { duration: 120_000 },
      );
    }, IDLE_WARNING_MS);
    idleTimerRef.current = setTimeout(() => forceLogout("idle"), IDLE_TIMEOUT_MS);
  }, [clearTimers, forceLogout]);

  // Idle timeout only active for admins
  useEffect(() => {
    if (!isAdmin) {
      clearTimers();
      return;
    }
    IDLE_EVENTS.forEach((e) =>
      window.addEventListener(e, resetIdleTimer, { passive: true }),
    );
    resetIdleTimer();
    return () => {
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      clearTimers();
    };
  }, [isAdmin, resetIdleTimer, clearTimers]);

  // Listen for Supabase auth state changes (token refresh, signout from another tab, etc.)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED" && !session) {
        forceLogout("token");
        return;
      }
      // Re-fetch user profile on any auth state change
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    });
    return () => subscription.unsubscribe();
  }, [forceLogout, queryClient]);

  const value = useMemo(
    () => ({
      user,
      role,
      isLoading,
      isAuthenticated,
      isAdmin,
      isVendor,
      isCustomer,
    }),
    [user, role, isLoading, isAuthenticated, isAdmin, isVendor, isCustomer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an <AuthProvider>");
  return ctx;
}
