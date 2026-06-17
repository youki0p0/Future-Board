import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Reads public env vars. Never reference the service_role / secret key here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client, or null when env vars are missing.
 * Callers must handle the null case so the app never crashes when unconfigured.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createClient(url as string, publishableKey as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return cached;
}

/** Throwing accessor for code paths that already verified configuration. */
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured. Set the NEXT_PUBLIC_SUPABASE_* env vars.");
  }
  return client;
}
