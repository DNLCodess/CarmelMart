"use client";

// Client boundary wrapper for providers that hold non-serializable state (QueryClient).
// app/layout.js is a Server Component, so it can't directly pass a QueryClient instance
// to QueryClientProvider. This component is the client boundary that owns the instance.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { PWAInstallProvider } from "@/lib/pwa-install-context";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  });
}

export default function Providers({ children }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PWAInstallProvider>
          {children}
        </PWAInstallProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
