import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Client « service » : contourne la RLS. À utiliser UNIQUEMENT côté serveur,
 * pour les parcours sans compte (page publique, agent, client) et les tâches planifiées.
 * Chaque requête doit alors filtrer elle-même par société / site / jeton.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl, serverEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
