import { createClient } from "@supabase/supabase-js";

// NEVER import this in client components.
// NEVER prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
// This client bypasses RLS — use only in Server Actions and Route Handlers.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
