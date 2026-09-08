import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this from a client component — the service
// role key bypasses RLS entirely. It reads SUPABASE_SERVICE_ROLE_KEY
// (no NEXT_PUBLIC_ prefix), so it's never bundled into browser code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
