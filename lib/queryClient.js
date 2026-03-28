import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance — used by AuthProvider and any code that needs
// to imperatively invalidate/refetch outside of a component tree.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      retry: 1,
    },
  },
});
