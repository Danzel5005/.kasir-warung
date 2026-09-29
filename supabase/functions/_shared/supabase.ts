import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Client dengan service_role — HANYA dipakai di Edge Function (server).
// Jangan pernah kirim key ini ke POS atau web-app.
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
