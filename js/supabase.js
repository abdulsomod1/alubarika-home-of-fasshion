import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured, SUPABASE_CONFIG_ERROR } from "./config.js";

export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export function requireSupabase() {
  if (!supabase) throw new Error(SUPABASE_CONFIG_ERROR || "Connect this site to Supabase to use account and live content features.");
  return supabase;
}
