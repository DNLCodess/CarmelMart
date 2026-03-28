"use client";

// Client boundary wrapper for providers that hold non-serializable state (QueryClient).
// app/layout.js is a Server Component, so it can't directly pass a QueryClient instance
// to QueryClientProvider. This component is the client boundary that owns the instance.

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth-context";

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
