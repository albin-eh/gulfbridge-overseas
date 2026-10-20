import { createClient } from "@supabase/supabase-js";

// These public browser-safe defaults support deployments that omit Vite env vars.
const url = import.meta.env.VITE_SUPABASE_URL?.trim() || "https://mxvhpczlusgjwstojxvv.supabase.co";
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim() || "sb_publishable_iMxkIP7YLX5-7j_aVbOuYA_-hKwQ6ps";

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
