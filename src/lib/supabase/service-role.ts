import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _serviceClient: SupabaseClient<Database> | null = null;

export function getServiceRoleClient(): SupabaseClient<Database> {
  if (_serviceClient) return _serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase service role credentials. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env."
    );
  }

  _serviceClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceClient;
}
