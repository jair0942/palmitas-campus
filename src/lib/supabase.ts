import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "campus-files";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole) {
    throw new Error("Supabase Storage no está configurado: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!adminClient) {
    adminClient = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export { SUPABASE_STORAGE_BUCKET as storageBucket };
